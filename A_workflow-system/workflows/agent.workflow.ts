import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  FinalDataSchema,
  ResultRowSchema,
  SqlExecutionSchema,
} from "@/mastra/contracts/workflow.contracts";
import { WorkflowRequestContextSchema } from "@/mastra/config/model.config";
import { finalDataStepScorers } from "@/mastra/scorers";
import {
  getValidationScore,
  splitValidationIssues,
} from "@/mastra/validation/issue-policy";
import { runRawSqlStep } from "./simple.workflow";
import { runVegaSpecSanityCheck } from "@/mastra/visualization/spec-sanity";

const oneShotOutputSchema = z.object({
  sql: z.string(),
  visualization: z.record(z.string(), z.unknown()),
});

const agentStep = createStep({
  id: "agent",
  description: "Generate SQL and visualization in one shot",
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: oneShotOutputSchema,
  execute: async ({ inputData, tracingContext, requestContext, mastra }) => {
    const oneShotAgent = mastra.getAgent("oneShotAgent");
    const response = await oneShotAgent.generate(
      [{ role: "user", content: inputData.question }],
      {
        maxSteps: 1,
        structuredOutput: {
          schema: oneShotOutputSchema,
        },
        tracingContext,
        requestContext,
      },
    );

    return response.object;
  },
});

const finalDataStep = createStep({
  id: "final-data",
  description: "Collect workflow output and emit final data payload",
  inputSchema: SqlExecutionSchema,
  outputSchema: FinalDataSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
  scorers: finalDataStepScorers,
  execute: async ({ state, getStepResult }) => {
    const oneShotResult = getStepResult("agent") as z.infer<
      typeof oneShotOutputSchema
    >;
    const execution = getStepResult("run-raw-sql") as z.infer<
      typeof SqlExecutionSchema
    >;

    const issues: string[] = [];
    if (!execution.ok && execution.error) {
      issues.push(`SQL execution failed: ${execution.error.message}`);
    }

    if (execution.ok) {
      const sanity = runVegaSpecSanityCheck({
        visualization: oneShotResult.visualization,
        metadata: execution.metadata,
      });
      issues.push(...sanity.issues);
    }

    const split = splitValidationIssues(issues);
    const passed = split.hard.length === 0;

    return {
      sql: oneShotResult.sql,
      data: state.data,
      metadata: execution.metadata,
      visualization: oneShotResult.visualization,
      quality: {
        workflow: "agent-workflow",
        passed,
        score: getValidationScore(split.all),
        issues: split.all,
        repairPrompt: passed
          ? undefined
          : "Fix one-shot SQL generation or visualization hard contract issues.",
      },
      attempts: {
        used: 1,
        max: 1,
        history: split.all,
      },
    };
  },
});

export const agentWorkflow = createWorkflow({
  id: "agent-workflow",
  description: "True one-shot baseline for SQL + visualization (no tools)",
  inputSchema: z.object({
    question: z.string(),
  }),
  requestContextSchema: WorkflowRequestContextSchema,
  outputSchema: FinalDataSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
})
  .then(agentStep)
  .then(runRawSqlStep)
  .then(finalDataStep)
  .commit();
