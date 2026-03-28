import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { PostgresStore } from "@mastra/pg";
import {
  Observability,
  DefaultExporter,
  SensitiveDataFilter,
  SamplingStrategyType,
} from "@mastra/observability";
import { retrievalAgent } from "./agents/retrieval.agent";
import { sqlAgent } from "./agents/sql.agent";
import { intentParserAgent } from "./agents/intent-parser.agent";
import { plannerAgent } from "./agents/planner.agent";
import { oneShotAgent } from "./agents/one-shot.agent";
import { vizAgent } from "./agents/viz.agent";
import { validatorAgent } from "./agents/validator.agent";
import { simpleWorkflow } from "./workflows/simple.workflow";
import { workflowRoute } from "@mastra/ai-sdk";
import { agentWorkflow } from "./workflows/agent.workflow";
import { complexWorkflow } from "./workflows/complex.workflow";
import {
  efficiencyScorer,
  intentAlignmentScorer,
  sqlExecutionSuccessScorer,
  sqlSafetyScorer,
  vegaContractScorer,
} from "./scorers";
import * as postgresAgentTools from "./tools/postgres-agent.tools";

export const mastra = new Mastra({
  workflows: {
    agentWorkflow,
    simpleWorkflow,
    complexWorkflow,
  },
  agents: {
    retrievalAgent,
    sqlAgent,
    intentParserAgent,
    plannerAgent,
    oneShotAgent,
    vizAgent,
    validatorAgent,
  },
  tools: { ...postgresAgentTools },
  scorers: {
    sqlSafetyScorer,
    sqlExecutionSuccessScorer,
    vegaContractScorer,
    intentAlignmentScorer,
    efficiencyScorer,
  },
  server: {
    apiRoutes: [
      workflowRoute({
        path: "/workflows/:workflowId",
      }),
    ],
  },
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.MASTRA_DATABASE_URL!,
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        sampling: { type: SamplingStrategyType.ALWAYS },
        exporters: [
          new DefaultExporter({ strategy: "realtime" }), // Persists traces to storage for Mastra Studio
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
