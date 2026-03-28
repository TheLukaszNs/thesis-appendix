import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { executeReadOnlySql } from "@/mastra/db/safe-sql";

const TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_LIMIT = 100;

export const sampleTableTool = createTool({
  id: "sample-table",
  description: "Sample rows from a whitelisted public table.",
  inputSchema: z.object({
    tableName: z.string().describe("The name of the table to sample"),
    limit: z.number().int().positive().describe("The number of rows to sample"),
  }),
  outputSchema: z.object({
    table: z.array(z.record(z.string(), z.unknown())),
  }),
  execute: async ({ tableName, limit }) => {
    if (!TABLE_NAME_PATTERN.test(tableName)) {
      throw new Error("Invalid table name format.");
    }

    const safeLimit = Math.min(limit, MAX_LIMIT);
    const escapedTableName = `"${tableName.replace(/\"/g, "\"\"")}"`;
    const query = `SELECT * FROM ${escapedTableName} LIMIT ${safeLimit}`;
    const execution = await executeReadOnlySql(query, { maxRows: safeLimit });

    if (!execution.ok) {
      throw new Error(execution.error?.message ?? "Failed to sample table rows.");
    }

    return { table: execution.data };
  },
});
