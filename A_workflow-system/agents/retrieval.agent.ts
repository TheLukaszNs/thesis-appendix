import { Agent } from "@mastra/core/agent";
import { resolveModelFromRequestContext } from "../config/model.config";
import { llmsFetcherTool } from "../tools/llms-fetcher.tool";

export const retrievalAgent = new Agent({
  id: "retrieval",
  name: "Retrieval Agent",
  instructions: [
    "You are a helpful assistant.",
    "Given a prompt, extract the `.md` URLs and call the provided tool to fetch the data.",
    "Only respond with relevant information extracted from the data.",
    "If presented with a llms.txt root data, try to find any relevant URLs inside and call the tool on them.",
    "Call the tool multiple times if needed to get all the relevant information.",
  ].join("\n"),
  model: resolveModelFromRequestContext,
  tools: { llmsFetcherTool },
});
