import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { pool } from "@/lib/db";
import { SQL_EXECUTION_LIMITS } from "@/mastra/config/model.config";
import { SqlExecutionSchema } from "@/mastra/contracts/workflow.contracts";
import { executeReadOnlySql, explainReadOnlySql } from "@/mastra/db/safe-sql";

type ListSchemasRow = {
  schema_name: string;
};

type ListObjectsRow = {
  object_name: string;
  object_type: string;
};

type ObjectTypeRow = {
  object_type: string;
};

type ColumnRow = {
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

type PrimaryKeyRow = {
  column_name: string;
};

type ForeignKeyRow = {
  constraint_name: string;
  column_name: string;
  referenced_schema: string;
  referenced_table: string;
  referenced_column: string;
};

type IndexRow = {
  index_name: string;
  index_definition: string;
};

const OBJECT_TYPES = [
  "table",
  "partitioned_table",
  "view",
  "materialized_view",
  "foreign_table",
] as const;

const ObjectTypeSchema = z.enum(OBJECT_TYPES);

function normalizeIdentifier(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function resolveSchemaName(input: {
  schemaName?: string;
  schema_name?: string;
}): string {
  return (
    normalizeIdentifier(input.schemaName) ??
    normalizeIdentifier(input.schema_name) ??
    "public"
  );
}

function resolveObjectName(input: {
  objectName?: string;
  object_name?: string;
  tableName?: string;
  table_name?: string;
}): string {
  const objectName =
    normalizeIdentifier(input.objectName) ??
    normalizeIdentifier(input.object_name) ??
    normalizeIdentifier(input.tableName) ??
    normalizeIdentifier(input.table_name);

  if (!objectName) {
    throw new Error(
      "Object name is required. Provide objectName, object_name, tableName, or table_name.",
    );
  }

  return objectName;
}

function mergeObjectTypes(input: {
  objectTypes?: Array<(typeof OBJECT_TYPES)[number]>;
  object_types?: Array<(typeof OBJECT_TYPES)[number]>;
}): Set<string> {
  return new Set([...(input.objectTypes ?? []), ...(input.object_types ?? [])]);
}

export const postgresListSchemasTool = createTool({
  id: "postgres_list_schemas",
  description:
    "List available PostgreSQL schemas. By default excludes system schemas.",
  inputSchema: z.object({
    includeSystem: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    schemas: z.array(z.string()),
  }),
  execute: async ({ includeSystem }) => {
    const query = includeSystem
      ? `
        SELECT nspname AS schema_name
        FROM pg_namespace
        ORDER BY nspname
      `
      : `
        SELECT nspname AS schema_name
        FROM pg_namespace
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
          AND nspname NOT LIKE 'pg_toast%'
          AND nspname NOT LIKE 'pg_temp_%'
        ORDER BY nspname
      `;

    const result = await pool.query<ListSchemasRow>(query);

    return {
      schemas: result.rows.map((row) => row.schema_name),
    };
  },
});

export const postgresListObjectsTool = createTool({
  id: "postgres_list_objects",
  description:
    "List tables/views/materialized views for a schema, with optional object-type filtering.",
  inputSchema: z.object({
    schemaName: z.string().optional(),
    schema_name: z.string().optional(),
    objectTypes: z.array(ObjectTypeSchema).optional(),
    object_types: z.array(ObjectTypeSchema).optional(),
  }),
  outputSchema: z.object({
    schema: z.string(),
    objects: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
      }),
    ),
  }),
  execute: async (input) => {
    const schemaName = resolveSchemaName(input);
    const requestedTypes = mergeObjectTypes(input);

    const result = await pool.query<ListObjectsRow>(
      `
      SELECT
        c.relname AS object_name,
        CASE c.relkind
          WHEN 'r' THEN 'table'
          WHEN 'p' THEN 'partitioned_table'
          WHEN 'v' THEN 'view'
          WHEN 'm' THEN 'materialized_view'
          WHEN 'f' THEN 'foreign_table'
          ELSE c.relkind::text
        END AS object_type
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      ORDER BY object_type, object_name
      `,
      [schemaName],
    );

    const rows =
      requestedTypes.size > 0
        ? result.rows.filter((row) => requestedTypes.has(row.object_type))
        : result.rows;

    return {
      schema: schemaName,
      objects: rows.map((row) => ({
        name: row.object_name,
        type: row.object_type,
      })),
    };
  },
});

export const postgresGetObjectDetailsTool = createTool({
  id: "postgres_get_object_details",
  description:
    "Get detailed metadata for a table/view including columns, primary key, foreign keys, and indexes.",
  inputSchema: z.object({
    schemaName: z.string().optional(),
    schema_name: z.string().optional(),
    objectName: z.string().optional(),
    object_name: z.string().optional(),
    tableName: z.string().optional(),
    table_name: z.string().optional(),
  }),
  outputSchema: z.object({
    schema: z.string(),
    object: z.string(),
    objectType: z.string(),
    columns: z.array(
      z.object({
        name: z.string(),
        position: z.number().int().positive(),
        dataType: z.string(),
        udtName: z.string(),
        nullable: z.boolean(),
        defaultValue: z.string().nullable(),
      }),
    ),
    primaryKey: z.array(z.string()),
    foreignKeys: z.array(
      z.object({
        name: z.string(),
        columns: z.array(z.string()),
        referencedSchema: z.string(),
        referencedTable: z.string(),
        referencedColumns: z.array(z.string()),
      }),
    ),
    indexes: z.array(
      z.object({
        name: z.string(),
        definition: z.string(),
      }),
    ),
  }),
  execute: async (input) => {
    const schemaName = resolveSchemaName(input);
    const objectName = resolveObjectName(input);

    const objectTypeResult = await pool.query<ObjectTypeRow>(
      `
      SELECT
        CASE c.relkind
          WHEN 'r' THEN 'table'
          WHEN 'p' THEN 'partitioned_table'
          WHEN 'v' THEN 'view'
          WHEN 'm' THEN 'materialized_view'
          WHEN 'f' THEN 'foreign_table'
          ELSE c.relkind::text
        END AS object_type
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relname = $2
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      LIMIT 1
      `,
      [schemaName, objectName],
    );

    if (!objectTypeResult.rows.length) {
      throw new Error(`Object '${schemaName}.${objectName}' was not found.`);
    }

    const [columnsResult, primaryKeyResult, foreignKeyResult, indexResult] =
      await Promise.all([
        pool.query<ColumnRow>(
          `
          SELECT
            column_name,
            ordinal_position,
            data_type,
            udt_name,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = $1
            AND table_name = $2
          ORDER BY ordinal_position
          `,
          [schemaName, objectName],
        ),
        pool.query<PrimaryKeyRow>(
          `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
          ORDER BY kcu.ordinal_position
          `,
          [schemaName, objectName],
        ),
        pool.query<ForeignKeyRow>(
          `
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS referenced_schema,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
          ORDER BY tc.constraint_name, kcu.ordinal_position
          `,
          [schemaName, objectName],
        ),
        pool.query<IndexRow>(
          `
          SELECT
            indexname AS index_name,
            indexdef AS index_definition
          FROM pg_indexes
          WHERE schemaname = $1
            AND tablename = $2
          ORDER BY indexname
          `,
          [schemaName, objectName],
        ),
      ]);

    const foreignKeysMap = new Map<
      string,
      {
        name: string;
        columns: string[];
        referencedSchema: string;
        referencedTable: string;
        referencedColumns: string[];
      }
    >();

    for (const row of foreignKeyResult.rows) {
      const existing = foreignKeysMap.get(row.constraint_name);

      if (existing) {
        existing.columns.push(row.column_name);
        existing.referencedColumns.push(row.referenced_column);
        continue;
      }

      foreignKeysMap.set(row.constraint_name, {
        name: row.constraint_name,
        columns: [row.column_name],
        referencedSchema: row.referenced_schema,
        referencedTable: row.referenced_table,
        referencedColumns: [row.referenced_column],
      });
    }

    return {
      schema: schemaName,
      object: objectName,
      objectType: objectTypeResult.rows[0].object_type,
      columns: columnsResult.rows.map((row) => ({
        name: row.column_name,
        position: row.ordinal_position,
        dataType: row.data_type,
        udtName: row.udt_name,
        nullable: row.is_nullable === "YES",
        defaultValue: row.column_default,
      })),
      primaryKey: primaryKeyResult.rows.map((row) => row.column_name),
      foreignKeys: Array.from(foreignKeysMap.values()),
      indexes: indexResult.rows.map((row) => ({
        name: row.index_name,
        definition: row.index_definition,
      })),
    };
  },
});

export const postgresExecuteSqlTool = createTool({
  id: "postgres_execute_sql",
  description:
    "Safely execute one read-only SQL statement with validation, timeout, and row limits.",
  inputSchema: z.object({
    sql: z.string().describe("The SQL query to execute"),
    maxRows: z
      .number()
      .int()
      .positive()
      .max(SQL_EXECUTION_LIMITS.maxRows)
      .optional()
      .describe(
        `Maximum rows to return (hard max ${SQL_EXECUTION_LIMITS.maxRows})`,
      ),
  }),
  outputSchema: SqlExecutionSchema,
  execute: async ({ sql, maxRows }) => {
    return executeReadOnlySql(sql, {
      maxRows: maxRows ?? SQL_EXECUTION_LIMITS.maxRows,
    });
  },
});

export const postgresExplainQueryTool = createTool({
  id: "postgres_explain_query",
  description:
    "Run EXPLAIN (FORMAT JSON) on a validated read-only SQL statement.",
  inputSchema: z.object({
    query: z.string().optional(),
    sql: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
  }),
  outputSchema: z.object({
    validatedSql: z.string(),
    plan: z.unknown(),
  }),
  execute: async ({ query, sql, timeoutMs }) => {
    const statement = query?.trim() || sql?.trim();

    if (!statement) {
      throw new Error("Provide `query` or `sql` for EXPLAIN.");
    }

    return explainReadOnlySql(statement, { timeoutMs });
  },
});

export const allTools = {
  postgresListSchemasTool,
  postgresListObjectsTool,
  postgresGetObjectDetailsTool,
  postgresExecuteSqlTool,
  postgresExplainQueryTool,
};
