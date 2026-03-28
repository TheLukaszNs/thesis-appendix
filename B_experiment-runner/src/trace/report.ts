import type {
  RunArtifact,
  TraceAnalysisResult,
  TraceAnalysisSummary,
  TraceCostReport,
  TracePerModelCost,
  TraceUsageTotals,
} from "../types.ts";
import { toUtcIso } from "../utils.ts";

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

function addTotals(target: TraceUsageTotals, source: TraceUsageTotals): void {
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.totalTokens += source.totalTokens;
  target.cachedInputTokens += source.cachedInputTokens;
  target.reasoningTokens += source.reasoningTokens;

  if (target.costUsd === null || source.costUsd === null) {
    target.costUsd = null;
    return;
  }

  target.costUsd = roundUsd(target.costUsd + source.costUsd);
}

function sortPerModel(items: TracePerModelCost[]): void {
  items.sort((a, b) => {
    if (a.costUsd === null && b.costUsd === null) return a.modelKey.localeCompare(b.modelKey);
    if (a.costUsd === null) return 1;
    if (b.costUsd === null) return -1;
    if (b.costUsd !== a.costUsd) return b.costUsd - a.costUsd;
    return a.modelKey.localeCompare(b.modelKey);
  });
}

export function buildTraceAnalysisSummary(runs: RunArtifact[]): TraceAnalysisSummary {
  const totals = createZeroTotals();
  const perModelMap = new Map<string, TracePerModelCost>();

  let analyzedRuns = 0;
  let pendingRuns = 0;
  let noTraceIdRuns = 0;
  let pricingMissingRuns = 0;
  let analysisErrorRuns = 0;

  for (const run of runs) {
    const analysis = run.traceAnalysis;

    if (!analysis) {
      pendingRuns += 1;
      continue;
    }

    analyzedRuns += 1;

    if (analysis.status === "pending") pendingRuns += 1;
    else if (analysis.status === "no_trace_id") noTraceIdRuns += 1;
    else if (analysis.status === "pricing_missing") pricingMissingRuns += 1;
    else if (analysis.status === "analysis_error") analysisErrorRuns += 1;

    addTotals(totals, analysis.totals);

    for (const model of analysis.perModel) {
      let aggregate = perModelMap.get(model.modelKey);

      if (!aggregate) {
        aggregate = {
          modelKey: model.modelKey,
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cachedInputTokens: 0,
          reasoningTokens: 0,
          costUsd: 0,
        };
        perModelMap.set(model.modelKey, aggregate);
      }

      aggregate.calls += model.calls;
      aggregate.inputTokens += model.inputTokens;
      aggregate.outputTokens += model.outputTokens;
      aggregate.totalTokens += model.totalTokens;
      aggregate.cachedInputTokens += model.cachedInputTokens;
      aggregate.reasoningTokens += model.reasoningTokens;

      if (aggregate.costUsd === null || model.costUsd === null) {
        aggregate.costUsd = null;
      } else {
        aggregate.costUsd = roundUsd(aggregate.costUsd + model.costUsd);
      }
    }
  }

  const perModel = Array.from(perModelMap.values());
  sortPerModel(perModel);

  return {
    analyzedRuns,
    pendingRuns,
    noTraceIdRuns,
    pricingMissingRuns,
    analysisErrorRuns,
    totals,
    perModel,
  };
}

export function buildTraceCostReport(params: {
  schemaVersion: string;
  experimentName: string;
  pricingCatalogVersion: string;
  runs: RunArtifact[];
  createdAtUtc?: string;
}): TraceCostReport {
  const summary = buildTraceAnalysisSummary(params.runs);

  return {
    schemaVersion: params.schemaVersion,
    experimentName: params.experimentName,
    createdAtUtc: params.createdAtUtc ?? toUtcIso(),
    pricingCatalogVersion: params.pricingCatalogVersion,
    source: {
      db: "postgresql",
      table: "public.mastra_ai_spans",
    },
    totals: summary.totals,
    perModel: summary.perModel,
    runs: params.runs.map((run) => ({
      caseId: run.caseId,
      repeatIndex: run.repeatIndex,
      traceId: run.traceId,
      status: run.traceAnalysis?.status ?? "pending",
      totalTokens: run.traceAnalysis?.totals.totalTokens ?? 0,
      costUsd: run.traceAnalysis?.totals.costUsd ?? null,
    })),
  };
}
