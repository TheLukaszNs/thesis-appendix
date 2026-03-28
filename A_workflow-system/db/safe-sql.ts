import type { TracingContext } from "@mastra/core/observability";
import { pool } from "@/lib/db";
import {
  QueryMetadataSchema,
  SqlExecutionSchema,
  type QueryMetadata,
  type SqlExecution,
} from "@/mastra/contracts/workflow.contracts";
import { SQL_EXECUTION_LIMITS } from "@/mastra/config/model.config";

const READ_ONLY_START = /^(with|select)\b/i;
const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|copy|vacuum|analyze|call|do|merge|refresh)\b/i;
const SLEEP_CALL = /\bpg_sleep\s*\(/i;

type DatabaseRow = Record<string, unknown>;
type PgErrorLike = {
  code?: string;
  message?: string;
};

function emptyMetadata(): QueryMetadata {
  return QueryMetadataSchema.parse({
    columns: [],
    rowCount: 0,
    sample: [],
  });
}

function stripQuotedSections(sqlText: string): string {
  return sqlText
    .replace(/'([^']|'')*'/g, "''")
    .replace(/\"([^\"]|\"\")*\"/g, '""')
    .replace(/\$\$[\s\S]*?\$\$/g, "$$ $$");
}

function hasMultipleStatements(sqlText: string): boolean {
  const stripped = stripQuotedSections(sqlText);
  const statements = stripped
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  return statements.length > 1;
}

export function normalizeSql(sqlText: string): string {
  return sqlText.trim().replace(/;+\s*$/, "");
}

export function validateReadOnlySql(
  sqlText: string,
): { ok: true; sql: string } | { ok: false; sql: string; error: string } {
  const sql = normalizeSql(sqlText);

  if (!sql) {
    return { ok: false, sql, error: "SQL query is empty." };
  }

  if (hasMultipleStatements(sql)) {
    return {
      ok: false,
      sql,
      error: "Only a single SQL statement is allowed.",
    };
  }

  const stripped = stripQuotedSections(sql);

  if (!READ_ONLY_START.test(sql)) {
    return {
      ok: false,
      sql,
      error: "Only read-only SELECT/WITH statements are allowed.",
    };
  }

  if (FORBIDDEN_KEYWORDS.test(stripped)) {
    return {
      ok: false,
      sql,
      error: "Detected forbidden non-read-only SQL keyword.",
    };
  }

  if (SLEEP_CALL.test(stripped)) {
    return {
      ok: false,
      sql,
      error: "Blocking functions like pg_sleep are not allowed.",
    };
  }

  return { ok: true, sql };
}

function buildExecutionResult(result: SqlExecution): SqlExecution {
  return SqlExecutionSchema.parse(result);
}

function clampPositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function buildLimitedQuery(validatedSql: string, rowLimit: number): string {
  return [
    "WITH __query_result AS (",
    validatedSql,
    ")",
    "SELECT * FROM __query_result",
    `LIMIT ${rowLimit}`,
  ].join("\n");
}

function toExecutionMessage(error: unknown, timeoutMs: number): string {
  const pgError = error as PgErrorLike;

  if (pgError?.code === "57014") {
    return `Query timed out after ${timeoutMs}ms.`;
  }

  if (typeof pgError?.message === "string" && pgError.message.trim().length) {
    return pgError.message;
  }

  return "SQL execution failed unexpectedly.";
}

async function queryRowsWithTimeout(
  sqlText: string,
  timeoutMs: number,
): Promise<DatabaseRow[]> {
  const safeTimeoutMs = clampPositiveInt(timeoutMs, SQL_EXECUTION_LIMITS.timeoutMs);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    try {
      await client.query(`SET LOCAL statement_timeout = ${safeTimeoutMs}`);
      const result = await client.query<DatabaseRow>(sqlText);
      await client.query("COMMIT");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
  } finally {
    client.release();
  }
}

function buildMetadata(rows: DatabaseRow[]): QueryMetadata {
  return {
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    rowCount: rows.length,
    sample: rows.slice(0, 2),
  };
}

export async function executeReadOnlySql(
  sqlText: string,
  options: {
    timeoutMs?: number;
    maxRows?: number;
    tracingContext?: TracingContext;
  } = {},
): Promise<SqlExecution> {
  const timeoutMs = clampPositiveInt(
    options.timeoutMs,
    SQL_EXECUTION_LIMITS.timeoutMs,
  );
  const maxRows = Math.min(
    clampPositiveInt(options.maxRows, SQL_EXECUTION_LIMITS.maxRows),
    SQL_EXECUTION_LIMITS.maxRows,
  );
  void options.tracingContext;

  const validated = validateReadOnlySql(sqlText);

  if (!validated.ok) {
    return buildExecutionResult({
      ok: false,
      sql: validated.sql,
      metadata: emptyMetadata(),
      data: [],
      error: {
        type: "validation",
        message: validated.error,
      },
    });
  }

  try {
    const rows = await queryRowsWithTimeout(
      buildLimitedQuery(validated.sql, maxRows + 1),
      timeoutMs,
    );
    const metadata = buildMetadata(rows);

    if (rows.length > maxRows) {
      return buildExecutionResult({
        ok: false,
        sql: validated.sql,
        metadata,
        data: [],
        error: {
          type: "limit",
          message: `Result row limit exceeded (${rows.length} > ${maxRows}).`,
          details:
            "Refine filters, aggregation, or LIMIT clause before execution.",
        },
      });
    }

    return buildExecutionResult({
      ok: true,
      sql: validated.sql,
      metadata,
      data: rows,
    });
  } catch (error) {
    return buildExecutionResult({
      ok: false,
      sql: validated.sql,
      metadata: emptyMetadata(),
      data: [],
      error: {
        type: "execution",
        message: toExecutionMessage(error, timeoutMs),
      },
    });
  }
}

export async function explainReadOnlySql(
  sqlText: string,
  options: {
    timeoutMs?: number;
    tracingContext?: TracingContext;
  } = {},
): Promise<{ validatedSql: string; plan: unknown }> {
  const timeoutMs = clampPositiveInt(
    options.timeoutMs,
    SQL_EXECUTION_LIMITS.timeoutMs,
  );
  void options.tracingContext;

  const validated = validateReadOnlySql(sqlText);

  if (!validated.ok) {
    throw new Error(validated.error);
  }

  try {
    const rows = await queryRowsWithTimeout(
      `EXPLAIN (FORMAT JSON) ${validated.sql}`,
      timeoutMs,
    );

    if (!rows.length) {
      throw new Error("EXPLAIN returned no rows.");
    }

    const firstRow = rows[0];
    const plan =
      firstRow["QUERY PLAN"] ?? firstRow.query_plan ?? Object.values(firstRow)[0];

    if (typeof plan === "undefined") {
      throw new Error("Failed to parse EXPLAIN output.");
    }

    return {
      validatedSql: validated.sql,
      plan,
    };
  } catch (error) {
    throw new Error(toExecutionMessage(error, timeoutMs));
  }
}
