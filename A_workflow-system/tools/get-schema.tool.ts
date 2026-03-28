import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { encode } from "@toon-format/toon";
import { getSchema } from "../db/service";

export const getSchemaTool = createTool({
  id: "get-schema",
  description: "Get the database schema using Drizzle metadata.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    schema: z.any().describe("The database schema in Toon format"),
  }),
  execute: async () => {
    return { schema: encode(getSchema()) };
  },
});
