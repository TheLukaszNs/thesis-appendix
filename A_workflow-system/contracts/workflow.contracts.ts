import { z } from "zod";

export const ResultRowSchema = z.record(z.string(), z.unknown());

export const QueryMetadataSchema = z.object({
  columns: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  sample: z.array(ResultRowSchema),
});

export const SqlDraftSchema = z.object({
  reasoning: z.string(),
  sql: z.string(),
  assumptions: z.array(z.string()).default([]),
});

export const SqlExecutionErrorSchema = z.object({
  type: z.enum(["validation", "execution", "limit"]),
  message: z.string(),
  details: z.string().optional(),
});

export const SqlExecutionSchema = z.object({
  ok: z.boolean(),
  sql: z.string(),
  metadata: QueryMetadataSchema,
  data: z.array(ResultRowSchema).default([]),
  error: SqlExecutionErrorSchema.optional(),
});

export const VisualizationSchema = z.object({
  visualization: z.record(z.string(), z.unknown()),
  reasoning: z.string().optional(),
});

export const ValidationSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1).default(0),
  issues: z.array(z.string()).default([]),
  repairPrompt: z.string().optional(),
});

export const AttemptsSchema = z.object({
  used: z.number().int().positive(),
  max: z.number().int().positive(),
  history: z.array(z.string()).default([]),
});

export const FinalDataSchema = z.object({
  sql: z.string(),
  data: z.array(ResultRowSchema).default([]),
  metadata: QueryMetadataSchema,
  visualization: z.record(z.string(), z.unknown()),
  quality: ValidationSchema.extend({
    workflow: z.string(),
  }),
  attempts: AttemptsSchema,
});

export type QueryMetadata = z.infer<typeof QueryMetadataSchema>;
export type SqlDraft = z.infer<typeof SqlDraftSchema>;
export type SqlExecution = z.infer<typeof SqlExecutionSchema>;
export type SqlExecutionError = z.infer<typeof SqlExecutionErrorSchema>;
export type VisualizationResult = z.infer<typeof VisualizationSchema>;
export type ValidationResult = z.infer<typeof ValidationSchema>;
export type FinalData = z.infer<typeof FinalDataSchema>;
