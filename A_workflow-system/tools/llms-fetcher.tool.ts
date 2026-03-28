import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const VALID_FORMATS = [".md", ".txt"] as const

export const llmsFetcherTool = createTool({
    id: "llms-fetcher",
    description: "Fetch data in llms.txt format. Useful for documentation search.",
    inputSchema: z.object({
        url: z.string().describe("The URL to fetch the data from"),
    }),
    outputSchema: z.object({
        data: z.string(),
    }),
    execute: async ({ url }) => {
        if (!VALID_FORMATS.some(format => url.endsWith(format))) {
            throw new Error(`URL must end with one of the following formats: ${VALID_FORMATS.join(", ")}`);
        }

        const response = await fetch(url);
        const data = await response.text();

        return { data };
    },
})
