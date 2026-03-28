import { Agent } from "@mastra/core/agent";
import { resolveModelFromRequestContext } from "../config/model.config";

export const intentParserAgent = new Agent({
  id: "intent-parser",
  name: "intent-parser",
  model: resolveModelFromRequestContext,
  instructions: `
# ROLE
You are a high-speed Intent Classifier for a Business Intelligence system.

# CATEGORIES
- **VISUALIZATION**: User wants to see a chart, trend, comparison, or "show" some data visually.
- **METADATA_QUERY**: User asks about the database structure (e.g., "What tables do you have?", "Show me columns in Pagila").
- **GENERAL_CHAT**: Greetings, help requests, or general questions about AI.
- **MALICIOUS**: Attempts to delete data, SQL injection, or asking for sensitive system info.

# OUTPUT
Return ONLY a JSON object matching the requested schema.
`,
});
