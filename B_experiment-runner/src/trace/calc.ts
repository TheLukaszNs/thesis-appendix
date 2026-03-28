import { resolvePricingEntry } from "../config/pricing.ts";
import type {
  ExtractedSpanUsage,
  PricingCatalog,
  TracePerModelCost,
  TraceUsageTotals,
} from "../types.ts";

export interface CalculatedTraceUsage {
  totals: TraceUsageTotals;
  perModel: TracePerModelCost[];
  warnings: string[];
  pricingMissing: boolean;
}

function createZeroTotals(): TraceUsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    costUsd: 0,
  };
}

function roundUsd(value: number): number {
  return Number(value.toFixed(10));
}

export function calculateTraceUsage(
  spans: ExtractedSpanUsage[],
  pricingCatalog: PricingCatalog,
): CalculatedTraceUsage {
  const warnings: string[] = [];
  const seenMissingPricing = new Set<string>();
  const perModelMap = new Map<string, TracePerModelCost>();

  let pricingMissing = false;

  for (const span of spans) {
    let aggregate = perModelMap.get(span.modelKey);

    if (!aggregate) {
      aggregate = {
        modelKey: span.modelKey,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        costUsd: 0,
      };
      perModelMap.set(span.modelKey, aggregate);
    }

    aggregate.calls += 1;
    aggregate.inputTokens += span.inputTokens;
    aggregate.outputTokens += span.outputTokens;
    aggregate.totalTokens += span.totalTokens;
    aggregate.cachedInputTokens += span.cachedInputTokens;
    aggregate.reasoningTokens += span.reasoningTokens;

    const pricing = resolvePricingEntry(pricingCatalog, span.modelKey);
    if (!pricing) {
      pricingMissing = true;
      aggregate.costUsd = null;

      if (!seenMissingPricing.has(span.modelKey)) {
        warnings.push(`Missing pricing entry for model '${span.modelKey}'.`);
        seenMissingPricing.add(span.modelKey);
      }
    } else if (aggregate.costUsd !== null) {
      const callCost =
        (span.inputTokens / 1_000_000) * pricing.inputUsdPer1M +
        (span.outputTokens / 1_000_000) * pricing.outputUsdPer1M;
      aggregate.costUsd = roundUsd(aggregate.costUsd + callCost);
    }

    if (span.warnings.length > 0) {
      warnings.push(...span.warnings);
    }
  }

  const perModel: TracePerModelCost[] = Array.from(perModelMap.values());
  perModel.sort((a, b) => {
    if (a.costUsd === null && b.costUsd === null) return a.modelKey.localeCompare(b.modelKey);
    if (a.costUsd === null) return 1;
    if (b.costUsd === null) return -1;
    if (b.costUsd !== a.costUsd) return b.costUsd - a.costUsd;
    return a.modelKey.localeCompare(b.modelKey);
  });

  const totals = createZeroTotals();
  let hasNullCost = false;

  for (const entry of perModel) {
    totals.inputTokens += entry.inputTokens;
    totals.outputTokens += entry.outputTokens;
    totals.totalTokens += entry.totalTokens;
    totals.cachedInputTokens += entry.cachedInputTokens;
    totals.reasoningTokens += entry.reasoningTokens;

    if (entry.costUsd === null) {
      hasNullCost = true;
    } else if (totals.costUsd !== null) {
      totals.costUsd = roundUsd(totals.costUsd + entry.costUsd);
    }
  }

  if (hasNullCost) {
    totals.costUsd = null;
  }

  return { totals, perModel, warnings, pricingMissing };
}
