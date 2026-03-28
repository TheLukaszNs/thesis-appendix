import path from "node:path";

import type { ModelPricingEntry, PricingCatalog } from "../types.ts";
import { isRecord } from "../utils.ts";

export const DEFAULT_PRICING_FILE = path.resolve(
  import.meta.dir,
  "../../config/model-pricing.json",
);

function assertFiniteNonNegative(value: unknown, field: string, key: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field} for pricing model '${key}'. Expected a non-negative number.`);
  }
  return value;
}

export function normalizeModelKey(modelKey: string): string {
  return modelKey.trim().toLowerCase();
}

export function loadPricingCatalog(filePath: string = DEFAULT_PRICING_FILE): PricingCatalog {
  const file = Bun.file(filePath);
  let content: string;

  try {
    // Use synchronous read for simplicity during startup
    const fs = require("node:fs");
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    throw new Error(`Cannot read pricing catalog file: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Pricing catalog is not valid JSON: ${filePath}`);
  }

  if (!isRecord(parsed)) {
    throw new Error("Pricing catalog root must be an object.");
  }

  const versionRaw = parsed.version;
  if (typeof versionRaw !== "string" || versionRaw.trim().length === 0) {
    throw new Error("Pricing catalog requires a non-empty 'version' string.");
  }

  const modelsRaw = parsed.models;
  if (!isRecord(modelsRaw)) {
    throw new Error("Pricing catalog requires a 'models' object.");
  }

  const models: Record<string, ModelPricingEntry> = {};

  for (const [keyRaw, value] of Object.entries(modelsRaw)) {
    const key = normalizeModelKey(keyRaw);

    if (!isRecord(value)) {
      throw new Error(`Pricing model '${keyRaw}' must be an object.`);
    }

    const inputUsdPer1M = assertFiniteNonNegative(value.inputUsdPer1M, "inputUsdPer1M", keyRaw);
    const outputUsdPer1M = assertFiniteNonNegative(value.outputUsdPer1M, "outputUsdPer1M", keyRaw);

    models[key] = {
      inputUsdPer1M,
      outputUsdPer1M,
      effectiveFrom: typeof value.effectiveFrom === "string" ? value.effectiveFrom : undefined,
      notes: typeof value.notes === "string" ? value.notes : undefined,
    };
  }

  return {
    version: versionRaw.trim(),
    models,
  };
}

export function resolvePricingEntry(
  catalog: PricingCatalog,
  modelKey: string,
): ModelPricingEntry | undefined {
  const normalized = normalizeModelKey(modelKey);
  return catalog.models[normalized];
}
