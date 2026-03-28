import { MastraModelConfig } from "@mastra/core/llm";
import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";

export const DEFAULT_MASTRA_MODEL: MastraModelConfig =
  "vercel/openai/gpt-5.2-codex";

export const WORKFLOW_REQUEST_CONTEXT_MODEL_KEY = "model" as const;

export const WorkflowRequestContextSchema = z
  .object({
    [WORKFLOW_REQUEST_CONTEXT_MODEL_KEY]: z.string().trim().min(1).optional(),
  })
  .passthrough();

export type WorkflowRequestContext = z.infer<typeof WorkflowRequestContextSchema>;

export const resolveModelFromRequestContext = ({
  requestContext,
}: {
  requestContext: RequestContext<unknown>;
}): MastraModelConfig => {
  const requestModel = requestContext.get(WORKFLOW_REQUEST_CONTEXT_MODEL_KEY);
  if (typeof requestModel === "string" && requestModel.trim().length > 0) {
    return requestModel.trim();
  }

  return DEFAULT_MASTRA_MODEL;
};

export const AGENT_DEFAULT_MAX_STEPS = 15;

export const WORKFLOW_MAX_ATTEMPTS = 4;

export const SQL_EXECUTION_LIMITS = {
  timeoutMs: 6_000,
  maxRows: 500,
} as const;
