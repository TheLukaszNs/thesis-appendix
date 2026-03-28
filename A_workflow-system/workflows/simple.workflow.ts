import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  FinalDataSchema,
  ResultRowSchema,
  SqlDraftSchema,
  SqlExecutionSchema,
  VisualizationSchema,
} from "@/mastra/contracts/workflow.contracts";
import { WorkflowRequestContextSchema } from "@/mastra/config/model.config";
import { executeReadOnlySql } from "@/mastra/db/safe-sql";
import { finalDataStepScorers } from "@/mastra/scorers";
import { PlannerSchema } from "@/mastra/types";
import { getValidationScore, splitValidationIssues } from "@/mastra/validation/issue-policy";
import { runVegaSpecSanityCheck } from "@/mastra/visualization/spec-sanity";

const sqlStep = createStep({
  id: "sql",
  description: "Generate SQL query from the user question",
  inputSchema: z.object({
    question: z.string(),
    plan: PlannerSchema.optional(),
    previous_feedback: z.string().optional(),
  }),
  outputSchema: SqlDraftSchema,
  execute: async ({ inputData, writer, tracingContext, requestContext, mastra }) => {
    const sqlAgent = mastra.getAgent("sqlAgent");
    const stream = await sqlAgent.stream(
      [
        {
          role: "user",
          content: JSON.stringify(inputData),
        },
      ],
      {
        toolChoice: "auto",
        structuredOutput: {
          schema: SqlDraftSchema,
        },
        tracingContext,
        requestContext,
      },
    );

    await stream.objectStream.pipeTo(writer);
    return stream.object;
  },
});

export const runRawSqlStep = createStep({
  id: "run-raw-sql",
  description: "Validate and execute read-only SQL",
  inputSchema: z.object({
    sql: z.string(),
  }),
  outputSchema: SqlExecutionSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
  execute: async ({ inputData, writer, setState, tracingContext }) => {
    const execution = await executeReadOnlySql(inputData.sql, {
      tracingContext,
    });

    await writer.write({
      type: "metadata",
      metadata: execution.metadata,
    });

    if (!execution.ok) {
      if (execution.error) {
        await writer.write({
          type: "sql-error",
          metadata: execution.error,
        });
      }

      throw new Error(
        `SQL execution failed: ${execution.error?.message ?? "Unknown SQL execution error."}`,
      );
    }

    if (execution.ok) {
      await setState({ data: execution.data });
    }

    return execution;
  },
});

const visualizeStep = createStep({
  id: "visualize",
  description: "Create Vega-Lite specification for SQL output",
  inputSchema: SqlExecutionSchema,
  outputSchema: VisualizationSchema,
  execute: async ({
    inputData,
    getInitData,
    getStepResult,
    writer,
    tracingContext,
    requestContext,
    mastra,
  }) => {
    const vizAgent = mastra.getAgent("vizAgent");
    const { question, plan } = getInitData() as {
      question: string;
      plan?: z.infer<typeof PlannerSchema>;
    };

    if (!inputData.ok) {
      return {
        visualization: {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          data: { name: "query_result" },
          mark: "text",
          encoding: {
            text: { value: "SQL execution failed. Fix query and retry." },
          },
          title: "Execution failed",
        },
        reasoning: inputData.error?.message,
      };
    }

    const { sql } = getStepResult("sql") as z.infer<typeof SqlDraftSchema>;
    const stream = await vizAgent.stream(
      [
        {
          role: "user",
          content: JSON.stringify({
            question,
            plan,
            sql,
            metadata: inputData.metadata,
          }),
        },
      ],
      {
        structuredOutput: {
          schema: VisualizationSchema,
        },
        tracingContext,
        requestContext,
      },
    );

    await stream.objectStream.pipeTo(writer);
    return stream.object;
  },
});

const finalDataStep = createStep({
  id: "final-data",
  description: "Collect workflow output and emit final data payload",
  inputSchema: VisualizationSchema,
  outputSchema: FinalDataSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
  scorers: finalDataStepScorers,
  execute: async ({ state, getStepResult }) => {
    const sqlDraft = getStepResult("sql") as z.infer<typeof SqlDraftSchema>;
    const execution = getStepResult("run-raw-sql") as z.infer<typeof SqlExecutionSchema>;
    const visualization = getStepResult("visualize") as z.infer<typeof VisualizationSchema>;

    const issues: string[] = [];

    if (!execution.ok && execution.error) {
      issues.push(`SQL execution failed: ${execution.error.message}`);
    }

    if (execution.ok) {
      const sanity = runVegaSpecSanityCheck({
        visualization: visualization.visualization,
        metadata: execution.metadata,
      });
      issues.push(...sanity.issues);
    }

    const split = splitValidationIssues(issues);
    const passed = split.hard.length === 0;

    return {
      sql: sqlDraft.sql,
      data: state.data,
      metadata: execution.metadata,
      visualization: visualization.visualization,
      quality: {
        workflow: "simple-workflow",
        passed,
        score: getValidationScore(split.all),
        issues: split.all,
        repairPrompt: passed ? undefined : "Fix SQL or visualization hard contract issues.",
      },
      attempts: {
        used: 1,
        max: 1,
        history: split.all,
      },
    };
  },
});

export const simpleWorkflow = createWorkflow({
  id: "simple-workflow",
  description: "Generate SQL, execute safely, and return visualization",
  inputSchema: z.object({
    question: z.string(),
  }),
  requestContextSchema: WorkflowRequestContextSchema,
  outputSchema: FinalDataSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
})
  .then(sqlStep)
  .then(runRawSqlStep)
  .then(visualizeStep)
  .then(finalDataStep)
  .commit();
