import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  FinalDataSchema,
  QueryMetadataSchema,
  ResultRowSchema,
  SqlDraftSchema,
  SqlExecutionSchema,
  ValidationSchema,
  VisualizationSchema,
} from "@/mastra/contracts/workflow.contracts";
import {
  WORKFLOW_MAX_ATTEMPTS,
  WorkflowRequestContextSchema,
} from "@/mastra/config/model.config";
import { executeReadOnlySql } from "@/mastra/db/safe-sql";
import { finalDataStepScorers } from "@/mastra/scorers";
import { PlannerSchema } from "@/mastra/types";
import {
  getValidationScore,
  splitValidationIssues,
} from "@/mastra/validation/issue-policy";
import { runVegaSpecSanityCheck } from "@/mastra/visualization/spec-sanity";

const PreviousAttemptSchema = z.object({
  sql: z.string().optional(),
  executionError: z.string().optional(),
  validationIssues: z.array(z.string()).default([]),
  repairHint: z.string().optional(),
});

const LoopStateSchema = z.object({
  question: z.string(),
  plan: PlannerSchema,
  attempt: z.number().int().min(1),
  maxAttempts: z.number().int().positive(),
  previousAttempt: PreviousAttemptSchema.optional(),
  historySummary: z.string(),
  latest: z
    .object({
      sqlDraft: SqlDraftSchema,
      execution: SqlExecutionSchema,
      visualization: VisualizationSchema,
      validation: ValidationSchema,
    })
    .optional(),
});

const plannerStep = createStep({
  id: "planner",
  description: "Generate a plan for SQL and visualization",
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    plan: PlannerSchema,
  }),
  execute: async ({ inputData, tracingContext, requestContext, mastra }) => {
    const plannerAgent = mastra.getAgent("plannerAgent");
    const stream = await plannerAgent.stream(
      [
        {
          role: "user",
          content: JSON.stringify({ question: inputData.question }),
        },
      ],
      {
        toolChoice: "auto",
        structuredOutput: {
          schema: PlannerSchema,
        },
        tracingContext,
        requestContext,
      },
    );

    return {
      plan: await stream.object,
    };
  },
});

const sqlDraftStep = createStep({
  id: "sql-draft",
  description: "Generate SQL draft with iterative repair context",
  inputSchema: LoopStateSchema,
  outputSchema: SqlDraftSchema,
  execute: async ({ inputData, tracingContext, requestContext, mastra }) => {
    const sqlAgent = mastra.getAgent("sqlAgent");
    const stream = await sqlAgent.stream(
      [
        {
          role: "user",
          content: JSON.stringify({
            question: inputData.question,
            plan: inputData.plan,
            attempt: inputData.attempt,
            previous_feedback: inputData.previousAttempt,
            history_summary: inputData.historySummary,
          }),
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

    return stream.object;
  },
});

const runSqlStep = createStep({
  id: "run-sql",
  description: "Execute generated SQL safely",
  inputSchema: SqlDraftSchema,
  outputSchema: SqlExecutionSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
  execute: async ({ inputData, setState, tracingContext }) => {
    const execution = await executeReadOnlySql(inputData.sql, {
      tracingContext,
    });

    if (execution.ok) {
      await setState({ data: execution.data });
    }

    return execution;
  },
});

const visualizeStep = createStep({
  id: "visualize",
  description: "Build visualization candidate from SQL output",
  inputSchema: SqlExecutionSchema,
  outputSchema: VisualizationSchema,
  execute: async ({
    inputData,
    getInitData,
    getStepResult,
    tracingContext,
    requestContext,
    mastra,
  }) => {
    const vizAgent = mastra.getAgent("vizAgent");
    const loopInput = getInitData() as z.infer<typeof LoopStateSchema>;
    const sqlDraft = getStepResult("sql-draft") as z.infer<
      typeof SqlDraftSchema
    >;

    if (!inputData.ok) {
      return {
        visualization: {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          data: { name: "query_result" },
          mark: "text",
          encoding: {
            text: { value: "SQL execution failed. Repair query and retry." },
          },
          title: "Execution failed",
        },
        reasoning: inputData.error?.message,
      };
    }

    const stream = await vizAgent.stream(
      [
        {
          role: "user",
          content: JSON.stringify({
            question: loopInput.question,
            plan: loopInput.plan,
            sql: sqlDraft.sql,
            metadata: inputData.metadata,
            validation_repair_hint: loopInput.previousAttempt?.repairHint,
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

    return stream.object;
  },
});

const sanityStep = createStep({
  id: "sanity-check",
  description: "Run deterministic validation for Vega contract and fields",
  inputSchema: VisualizationSchema,
  outputSchema: z.object({
    passed: z.boolean(),
    issues: z.array(z.string()),
    fields: z.array(z.string()),
  }),
  execute: async ({ getStepResult }) => {
    const execution = getStepResult("run-sql") as z.infer<
      typeof SqlExecutionSchema
    >;
    const visualization = getStepResult("visualize") as z.infer<
      typeof VisualizationSchema
    >;

    if (!execution.ok) {
      return {
        passed: false,
        issues: [
          `SQL execution failed before sanity check: ${execution.error?.message ?? "unknown error"}`,
        ],
        fields: [],
      };
    }

    return runVegaSpecSanityCheck({
      visualization: visualization.visualization,
      metadata: execution.metadata,
    });
  },
});

const validateStep = createStep({
  id: "validate",
  description: "LLM validation over SQL + visualization consistency",
  inputSchema: z.object({
    passed: z.boolean(),
    issues: z.array(z.string()),
    fields: z.array(z.string()),
  }),
  outputSchema: ValidationSchema,
  execute: async ({
    inputData,
    getInitData,
    getStepResult,
    tracingContext,
    requestContext,
    mastra,
  }) => {
    const validatorAgent = mastra.getAgent("validatorAgent");
    const loopInput = getInitData() as z.infer<typeof LoopStateSchema>;
    const sqlDraft = getStepResult("sql-draft") as z.infer<
      typeof SqlDraftSchema
    >;
    const execution = getStepResult("run-sql") as z.infer<
      typeof SqlExecutionSchema
    >;
    const visualization = getStepResult("visualize") as z.infer<
      typeof VisualizationSchema
    >;

    if (!execution.ok) {
      const issue = `SQL execution failed: ${execution.error?.message ?? "unknown error"}`;
      return {
        passed: false,
        score: 0,
        issues: [issue],
        repairPrompt:
          "Fix SQL query structure, aliases, and filters before retrying.",
      };
    }

    const stream = await validatorAgent.stream(
      [
        {
          role: "user",
          content: JSON.stringify({
            question: loopInput.question,
            plan: loopInput.plan,
            sql: sqlDraft.sql,
            visualization: visualization.visualization,
            metadata: execution.metadata,
            deterministic_issues: inputData.issues,
          }),
        },
      ],
      {
        structuredOutput: {
          schema: z.object({
            isValid: z.boolean(),
            feedback: z.string().optional(),
            issues: z.array(z.string()).optional(),
          }),
        },
        tracingContext,
        requestContext,
      },
    );

    const llmValidation = await stream.object;
    const issues = [...inputData.issues];

    if (llmValidation.issues?.length) {
      issues.push(...llmValidation.issues);
    }

    if (!llmValidation.isValid && llmValidation.feedback) {
      issues.push(llmValidation.feedback);
    }

    const split = splitValidationIssues(issues);
    const passed = split.hard.length === 0;
    const score = getValidationScore(split.all);

    return {
      passed,
      score,
      issues: split.all,
      repairPrompt: passed
        ? undefined
        : [
            "Repair SQL and Vega spec using these hard issues:",
            ...split.hard.map((issue) => `- ${issue}`),
          ].join("\n"),
    };
  },
});

const iterationWorkflow = createWorkflow({
  id: "react-sql-viz-iteration",
  description:
    "Single ReAct iteration: draft SQL, execute, visualize, validate",
  inputSchema: LoopStateSchema,
  outputSchema: LoopStateSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
})
  .then(sqlDraftStep)
  .then(runSqlStep)
  .then(visualizeStep)
  .then(sanityStep)
  .then(validateStep)
  .map(
    async ({ getInitData, getStepResult }) => {
      const inputData = getInitData() as z.infer<typeof LoopStateSchema>;
      const sqlDraft = getStepResult("sql-draft") as z.infer<
        typeof SqlDraftSchema
      >;
      const execution = getStepResult("run-sql") as z.infer<
        typeof SqlExecutionSchema
      >;
      const visualization = getStepResult("visualize") as z.infer<
        typeof VisualizationSchema
      >;
      const validation = getStepResult("validate") as z.infer<
        typeof ValidationSchema
      >;

      const historyLine = validation.passed
        ? `Attempt ${inputData.attempt}: passed`
        : `Attempt ${inputData.attempt}: ${validation.issues.join(" | ") || "failed"}`;

      const historySummary = [inputData.historySummary, historyLine]
        .filter(Boolean)
        .join("\n");

      return {
        question: inputData.question,
        plan: inputData.plan,
        attempt: inputData.attempt + 1,
        maxAttempts: inputData.maxAttempts,
        previousAttempt: {
          sql: sqlDraft.sql,
          executionError: execution.error?.message,
          validationIssues: validation.issues,
          repairHint: validation.repairPrompt,
        },
        historySummary,
        latest: {
          sqlDraft,
          execution,
          visualization,
          validation,
        },
      };
    },
    { id: "iteration-output" },
  )
  .commit();

const finalDataStep = createStep({
  id: "final-data",
  description: "Collect workflow output and emit final data payload",
  inputSchema: LoopStateSchema,
  outputSchema: FinalDataSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
  scorers: finalDataStepScorers,
  execute: async ({ state, getStepResult }) => {
    const loopState = getStepResult("react-sql-viz-iteration") as z.infer<
      typeof LoopStateSchema
    >;

    const latest = loopState.latest;
    const usedAttempts = Math.min(loopState.attempt - 1, loopState.maxAttempts);
    const history = loopState.historySummary
      ? loopState.historySummary.split("\n").filter(Boolean)
      : [];

    return {
      sql: latest?.sqlDraft.sql ?? "",
      data: latest?.execution.data ?? state.data,
      metadata:
        latest?.execution.metadata ??
        QueryMetadataSchema.parse({
          columns: [],
          rowCount: 0,
          sample: [],
        }),
      visualization:
        latest?.visualization.visualization ??
        ({
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          data: { name: "query_result" },
          mark: "text",
          encoding: { text: { value: "No visualization generated." } },
          title: "No result",
        } as Record<string, unknown>),
      quality: {
        workflow: "complex-workflow",
        passed: latest?.validation.passed ?? false,
        score: latest?.validation.score ?? 0,
        issues: latest?.validation.issues ?? [
          "No validation output available.",
        ],
        repairPrompt: latest?.validation.repairPrompt,
      },
      attempts: {
        used: usedAttempts,
        max: loopState.maxAttempts,
        history,
      },
    };
  },
});

export const complexWorkflow = createWorkflow({
  id: "complex-workflow",
  description: "ReAct workflow with iterative SQL/viz repair loop",
  inputSchema: z.object({
    question: z.string(),
  }),
  requestContextSchema: WorkflowRequestContextSchema,
  outputSchema: FinalDataSchema,
  stateSchema: z.object({
    data: z.array(ResultRowSchema).default([]),
  }),
})
  .then(plannerStep)
  .map(
    async ({ getInitData, getStepResult }) => {
      const initData = getInitData() as { question: string };
      const plannerOutput = getStepResult("planner") as z.infer<
        typeof plannerStep.outputSchema
      >;

      return {
        question: initData.question,
        plan: plannerOutput.plan,
        attempt: 1,
        maxAttempts: WORKFLOW_MAX_ATTEMPTS,
        previousAttempt: undefined,
        historySummary: "",
        latest: undefined,
      };
    },
    { id: "react-loop-input" },
  )
  .dountil(iterationWorkflow, async ({ inputData, iterationCount }) => {
    const loopState = inputData as z.infer<typeof LoopStateSchema>;
    const passed = loopState.latest?.validation.passed ?? false;
    return passed || iterationCount >= loopState.maxAttempts;
  })
  .then(finalDataStep)
  .commit();
