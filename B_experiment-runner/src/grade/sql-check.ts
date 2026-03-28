import { SQL } from "bun";

import type { GradableRun, SqlCheckError, SqlCheckResult, IssueTag } from "./types.ts";

function classifyExplainError(message: string): { tag: IssueTag; detail: string } {
  const lower = message.toLowerCase();

  if (/relation ".*" does not exist/.test(lower)) {
    const match = message.match(/relation "(.*)" does not exist/i);
    return { tag: "invalid_table", detail: match ? `Table: ${match[1]}` : message };
  }

  if (/column ".*" does not exist/.test(lower)) {
    const match = message.match(/column "(.*)" does not exist/i);
    return { tag: "invalid_column", detail: match ? `Column: ${match[1]}` : message };
  }

  return { tag: "syntax_error", detail: message };
}

export async function runSqlChecks(
  runs: GradableRun[],
  databaseUrl: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const runsWithSql = runs.filter((r) => r.sqlPath !== null);
  if (runsWithSql.length === 0) {
    return;
  }

  const sql = new SQL(databaseUrl);

  try {
    for (let i = 0; i < runsWithSql.length; i++) {
      const run = runsWithSql[i]!;
      onProgress?.(i + 1, runsWithSql.length);

      const result = await checkSingleRun(sql, run);
      run.sqlCheck = result;
    }
  } finally {
    await sql.close();
  }
}

async function checkSingleRun(
  sql: InstanceType<typeof SQL>,
  run: GradableRun,
): Promise<SqlCheckResult> {
  if (!run.sqlPath) {
    return { status: "skipped", errors: [], rowCount: null };
  }

  const file = Bun.file(run.sqlPath);
  if (!(await file.exists())) {
    return { status: "skipped", errors: [], rowCount: null };
  }

  const querySql = await file.text();
  if (!querySql.trim()) {
    return { status: "skipped", errors: [], rowCount: null };
  }

  const errors: SqlCheckError[] = [];

  // Run EXPLAIN to detect structural errors
  try {
    await sql.unsafe(`EXPLAIN ${querySql}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const { tag, detail } = classifyExplainError(message);
    errors.push({ tag, message: ISSUE_LABELS[tag], detail });

    return {
      status: "error",
      errors,
      rowCount: null,
    };
  }

  // EXPLAIN succeeded — check for zero rows using stored rowCount
  const rowCount = run.rowCount;
  if (rowCount === 0 && run.success) {
    errors.push({
      tag: "zero_rows",
      message: ISSUE_LABELS.zero_rows,
      detail: "Query returned 0 rows",
    });
  }

  return {
    status: errors.length > 0 ? "error" : "ok",
    errors,
    rowCount,
  };
}

const ISSUE_LABELS: Record<IssueTag, string> = {
  invalid_table: "References non-existent table",
  invalid_column: "References non-existent column",
  syntax_error: "SQL syntax error",
  zero_rows: "Query returns 0 rows",
  wrong_time_range: "Wrong time range",
  wrong_aggregation: "Wrong aggregation",
  missing_join: "Missing table join",
  unnecessary_filter: "Unnecessary filter",
  wrong_granularity: "Wrong granularity",
  wrong_chart_type: "Wrong chart type",
  missing_axis: "Missing axis or encoding",
  swapped_axes: "X and Y axes swapped",
  missing_title: "Missing title",
  missing_axis_labels: "Missing axis labels",
  unreadable_legend: "Unreadable or missing legend",
  too_many_series: "Too many data series",
  result_mismatch: "Result mismatch vs golden SQL",
  viz_data_mismatch: "Viz doesn't match SQL data",
  invalid_output_shape: "Output format broken",
};
