import { calculateTraceUsage } from "./calc.ts";
import { extractSpanUsage } from "./extract.ts";
import type { TraceSpanStore } from "./store.ts";
import type { PricingCatalog, TraceAnalysisResult, TraceUsageTotals } from "../types.ts";
import { toUtcIso } from "../utils.ts";

export interface AnalyzeTraceOptions {
  store: TraceSpanStore;
  pricingCatalog: PricingCatalog;
  timeoutMs: number;
  pollMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function baseResult(params: {
  status: TraceAnalysisResult["status"];
  analyzedAtUtc: string;
  traceId?: string;
  attempts: number;
  spanCount: number;
  warnings?: string[];
  error?: TraceAnalysisResult["error"];
}): TraceAnalysisResult {
  return {
    status: params.status,
    analyzedAtUtc: params.analyzedAtUtc,
    traceId: params.traceId,
    attempts: params.attempts,
    spanCount: params.spanCount,
    totals: createZeroTotals(),
    perModel: [],
    warnings: params.warnings ?? [],
    error: params.error,
  };
}

export async function analyzeTrace(
  traceIdRaw: string | undefined,
  options: AnalyzeTraceOptions,
): Promise<TraceAnalysisResult> {
  const analyzedAtUtc = options.now?.() ?? toUtcIso();
  const traceId = traceIdRaw?.trim();

  if (!traceId) {
    return baseResult({
      status: "no_trace_id",
      analyzedAtUtc,
      attempts: 0,
      spanCount: 0,
    });
  }

  const startTime = Date.now();
  const sleep = options.sleep ?? delay;
  let attempts = 0;
  let lastSpanCount = 0;
  let sawUsageNotReady = false;
  const pendingWarnings = new Set<string>();

  while (true) {
    attempts += 1;

    let spans;
    try {
      spans = await options.store.listModelGenerationSpans(traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return baseResult({
        status: "analysis_error",
        analyzedAtUtc,
        traceId,
        attempts,
        spanCount: 0,
        error: { kind: "db", message },
      });
    }

    if (spans.length > 0) {
      lastSpanCount = spans.length;
      const extracted = spans.map((span) => extractSpanUsage(span));
      const usageReady = extracted.every((item) => item.usageReady);

      if (!usageReady) {
        sawUsageNotReady = true;
        for (const item of extracted) {
          for (const warning of item.warnings) {
            pendingWarnings.add(warning);
          }
        }

        if (Date.now() - startTime >= options.timeoutMs) {
          pendingWarnings.add(
            `Model_generation spans were found for traceId '${traceId}', but token usage is not ready within timeout window.`,
          );
          return baseResult({
            status: "pending",
            analyzedAtUtc,
            traceId,
            attempts,
            spanCount: lastSpanCount,
            warnings: Array.from(pendingWarnings),
          });
        }

        await sleep(options.pollMs);
        continue;
      }

      const calculated = calculateTraceUsage(extracted, options.pricingCatalog);
      const warnings = Array.from(new Set(calculated.warnings));

      return {
        status: calculated.pricingMissing ? "pricing_missing" : "computed",
        analyzedAtUtc,
        traceId,
        attempts,
        spanCount: spans.length,
        totals: calculated.totals,
        perModel: calculated.perModel,
        warnings,
      };
    }

    if (Date.now() - startTime >= options.timeoutMs) {
      if (sawUsageNotReady) {
        pendingWarnings.add(
          `Model_generation spans were found for traceId '${traceId}', but token usage is not ready within timeout window.`,
        );
        return baseResult({
          status: "pending",
          analyzedAtUtc,
          traceId,
          attempts,
          spanCount: lastSpanCount,
          warnings: Array.from(pendingWarnings),
        });
      }

      return baseResult({
        status: "pending",
        analyzedAtUtc,
        traceId,
        attempts,
        spanCount: lastSpanCount,
        warnings: [
          `No model_generation spans found for traceId '${traceId}' within timeout window.`,
        ],
      });
    }

    await sleep(options.pollMs);
  }
}
