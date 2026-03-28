import z from "zod";

export const VizIntentSchema = z.object({
  intent: z.enum([
    "VISUALIZATION",
    "METADATA_QUERY",
    "GENERAL_CHAT",
    "MALICIOUS",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type VizIntent = z.infer<typeof VizIntentSchema>;

export const PlannerSchema = z.object({
  data_requirements: z.object({
    metrics: z.array(z.string()),
    dimensions: z.array(z.string()),
    filters: z.array(z.string()),
    grain: z.string(),
    aliases: z.record(z.string(), z.string()),
    output_fields: z
      .array(z.string())
      .describe("Expected SQL output aliases used by the visualization."),
  }),
  visual_requirements: z.object({
    chart_type: z.enum(["bar", "line", "scatter", "pie"]),
    x_axis: z.string(),
    y_axis: z.string(),
    color_group: z.string().optional(),
    title: z.string(),
  }),
  assumptions: z
    .array(z.string())
    .describe("Explicit assumptions that downstream agents must preserve."),
});

export type Planner = z.infer<typeof PlannerSchema>;
