import type { ExtractedSpanUsage, TraceSpanRow } from "../types.ts";
import { normalizeModelKey } from "../config/pricing.ts";
import { isRecord } from "../utils.ts";

function toSafeTokenInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  return undefined;
}

function readPathValue(record: Record<string, unknown>, path: string): unknown {
  if (path in record) {
    return record[path];
  }

  const segments = path.split(".");
  let current: unknown = record;

  for (const segment of segments) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function readFirstNumber(record: Record<string, unknown>, paths: string[]): number | undefined {
  for (const path of paths) {
    const candidate = readPathValue(record, path);
    const number = toSafeTokenInt(candidate);
    if (number !== undefined) {
      return number;
    }
  }
  return undefined;
}

function readFirstTokenField(
  record: Record<string, unknown>,
  paths: string[],
): { value: number | undefined; present: boolean } {
  const value = readFirstNumber(record, paths);
  return { value, present: value !== undefined };
}

function normalizeAttributes(attributesRaw: unknown): Record<string, unknown> | undefined {
  if (isRecord(attributesRaw)) {
    return attributesRaw;
  }

  if (typeof attributesRaw === "string" && attributesRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(attributesRaw);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function normalizeUsageAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  const usageRaw = attributes.usage ?? attributes.tokenUsage;

  if (isRecord(usageRaw)) {
    return usageRaw;
  }

  if (typeof usageRaw === "string" && usageRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(usageRaw);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  return attributes;
}

function readModelKey(attributes: Record<string, unknown>): {
  modelKey: string;
  warning?: string;
} {
  const modelRaw =
    readPathValue(attributes, "model") ??
    readPathValue(attributes, "modelId") ??
    readPathValue(attributes, "model.id") ??
    readPathValue(attributes, "gen_ai.request.model");

  const providerRaw =
    readPathValue(attributes, "provider") ??
    readPathValue(attributes, "modelProvider") ??
    readPathValue(attributes, "model.provider") ??
    readPathValue(attributes, "gen_ai.system");

  const model = typeof modelRaw === "string" ? modelRaw.trim() : "";
  const provider = typeof providerRaw === "string" ? providerRaw.trim() : "";

  if (!model) {
    return {
      modelKey: "unknown",
      warning: "Missing model identifier in span attributes.",
    };
  }

  const key = model.includes("/") || provider.length === 0 ? model : `${provider}/${model}`;

  return { modelKey: normalizeModelKey(key) };
}

export function extractSpanUsage(span: TraceSpanRow): ExtractedSpanUsage {
  const warnings: string[] = [];
  const normalizedAttributes = normalizeAttributes(span.attributes);

  if (!normalizedAttributes) {
    return {
      modelKey: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      usageReady: false,
      usageReadinessReason: "Span attributes are missing or invalid.",
      warnings: ["Span attributes are missing or invalid."],
    };
  }

  const modelInfo = readModelKey(normalizedAttributes);
  if (modelInfo.warning) {
    warnings.push(modelInfo.warning);
  }

  const usage = normalizeUsageAttributes(normalizedAttributes);

  const inputTokenField = readFirstTokenField(usage, [
    "promptTokens",
    "inputTokens",
    "prompt_tokens",
    "input_tokens",
  ]);
  const inputTokens = inputTokenField.value ?? 0;

  const outputTokenField = readFirstTokenField(usage, [
    "completionTokens",
    "outputTokens",
    "completion_tokens",
    "output_tokens",
  ]);
  const outputTokens = outputTokenField.value ?? 0;

  const totalTokens =
    readFirstNumber(usage, ["totalTokens", "total_tokens"]) ?? inputTokens + outputTokens;

  const cachedInputTokens =
    readFirstNumber(usage, [
      "promptCacheHitTokens",
      "cachedInputTokens",
      "cacheInputTokens",
      "inputDetails.cacheRead",
      "input_details.cache_read",
      "cached_input_tokens",
    ]) ?? 0;

  const reasoningTokens =
    readFirstNumber(usage, [
      "reasoningTokens",
      "outputDetails.reasoning",
      "output_details.reasoning",
      "reasoning_tokens",
    ]) ?? 0;

  const usageReady = inputTokenField.present && outputTokenField.present;
  let usageReadinessReason: string | undefined;

  if (!usageReady) {
    usageReadinessReason =
      "Token usage is not ready yet (missing input/output token fields).";
    warnings.push(usageReadinessReason);
  }

  return {
    modelKey: modelInfo.modelKey,
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens,
    reasoningTokens,
    usageReady,
    usageReadinessReason,
    warnings,
  };
}
