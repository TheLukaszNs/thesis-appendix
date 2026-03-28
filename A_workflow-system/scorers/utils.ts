import { FinalDataSchema, type FinalData } from "@/mastra/contracts/workflow.contracts";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "show",
  "list",
  "what",
  "which",
  "where",
  "when",
  "into",
  "over",
  "under",
  "only",
  "each",
  "between",
  "than",
  "then",
]);

export function parseFinalData(output: unknown): FinalData | null {
  const parsed = FinalDataSchema.safeParse(output);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function clampScore(score: number): number {
  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(1, score));
}
