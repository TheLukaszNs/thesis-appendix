import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { explainReadOnlySql } from "@/mastra/db/safe-sql";

export const explainQueryTool = createTool({
  id: "explain-query",
  description:
    "Run EXPLAIN (FORMAT JSON) on a validated read-only SQL query.",
  inputSchema: z.object({
    query: z.string().describe("The SQL query to explain"),
  }),
  outputSchema: z.object({
    plan: z.unknown(),
    validatedSql: z.string(),
  }),
  execute: async ({ query }) => {
    return explainReadOnlySql(query);
  },
});
