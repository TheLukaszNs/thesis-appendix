import type {
  FailureStage,
  RunArtifact,
  TraceAnalysisStatus,
} from "../types.ts";
import { percentile } from "../utils.ts";
import type { LoadedInvocation } from "./loader.ts";
import { computeGradingMetrics, type GradingMetrics } from "./grading-metrics.ts";

const CI95_Z = 1.959963984540054;
const MAX_TOP_FAILURE_MESSAGES = 10;

type FailureStageKey = FailureStage | "unknown";
type TraceStatusKey = TraceAnalysisStatus | "missing";
type CaseStability = "always_pass" | "flaky" | "always_fail";

export interface AggregatedModelCost {
  modelKey: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  costUsd: number;
}

export interface RateWithCi {
  successes: number;
  total: number;
  rate: number;
  ci95: { low: number; high: number };
}

export interface DurationStats {
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  meanMs: number;
}

export interface FailureStageBreakdown {
  stage: FailureStageKey;
  count: number;
  rate: number;
}

export interface FailureKindBreakdown {
  kind: string;
  count: number;
  rate: number;
}

export interface FailureMessageBreakdown {
  message: string;
  count: number;
}

export interface CaseMetric {
  caseId: string;
  successRuns: number;
  failedRuns: number;
  passAt1: boolean;
  passAtN: boolean;
  stability: CaseStability;
  meanScore: number | null;
  exStatus: string | null;
}

export interface ApproachMetrics {
  approachId: string;
  invocationDir: string;
  selector: string;
  invocationPath: string;
  runCount: number;
  caseCount: number;
  runsPerPrompt: number;
  runSuccess: RateWithCi;
  passAt1: RateWithCi;
  passAtN: RateWithCi;
  failures: {
    count: number;
    byStage: FailureStageBreakdown[];
    byKind: FailureKindBreakdown[];
    topMessages: FailureMessageBreakdown[];
  };
  stability: {
    alwaysPassCases: number;
    flakyCases: number;
    alwaysFailCases: number;
  };
  latencyMs: {
    all: DurationStats;
    success: DurationStats | null;
    failure: DurationStats | null;
    allDurations: number[];
    successDurations: number[];
  };
  cost: {
    totalUsd: number;
    perRunUsd: number;
    perSuccessfulRunUsd: number | null;
    totalTokens: number;
    tokensPerSuccessfulRun: number | null;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalReasoningTokens: number;
    totalCachedInputTokens: number;
    totalCalls: number;
    perModel: AggregatedModelCost[];
    traceIdCoverageRate: number;
    traceStatusCounts: Record<TraceStatusKey, number>;
  };
  grading: GradingMetrics;
  perCase: CaseMetric[];
}

export interface CaseApproachRow {
  approachId: string;
  passAt1: boolean;
  passAtN: boolean;
  successRuns: number;
  failedRuns: number;
  stability: CaseStability;
  meanScore: number | null;
  exStatus: string | null;
}

export interface CaseComparisonRow {
  caseId: string;
  approaches: CaseApproachRow[];
}

export function computeWilsonCi(successes: number, total: number): { low: number; high: number } {
  if (total <= 0) return { low: 0, high: 0 };
  const n = total;
  const p = successes / n;
  const z2 = CI95_Z * CI95_Z;
  const denominator = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const marginTerm = (p * (1 - p) + z2 / (4 * n)) / n;
  const margin = CI95_Z * Math.sqrt(marginTerm);
  return {
    low: Math.max(0, (center - margin) / denominator),
    high: Math.min(1, (center + margin) / denominator),
  };
}

export function toRateWithCi(successes: number, total: number): RateWithCi {
  return {
    successes,
    total,
    rate: total > 0 ? successes / total : 0,
    ci95: computeWilsonCi(successes, total),
  };
}

function computeDurationStats(values: number[]): DurationStats | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, v) => acc + v, 0);
  return {
    minMs: Math.min(...values),
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    maxMs: Math.max(...values),
    meanMs: total / values.length,
  };
}

function normalizeErrorMessage(message: string | undefined): string {
  if (!message || message.trim().length === 0) return "unknown";
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 200 ? `${normalized.slice(0, 197)}...` : normalized;
}

export function computeApproachMetrics(
  invocation: LoadedInvocation,
  canonicalCaseIds: string[],
): ApproachMetrics {
  const failedRuns = invocation.runs.filter((run) => !run.success);
  const successRuns = invocation.runs.length - failedRuns.length;

  const runsByCase = new Map<string, RunArtifact[]>();
  for (const run of invocation.runs) {
    const existing = runsByCase.get(run.caseId);
    if (existing) {
      existing.push(run);
    } else {
      runsByCase.set(run.caseId, [run]);
    }
  }

  for (const runs of runsByCase.values()) {
    runs.sort((a, b) => a.repeatIndex - b.repeatIndex);
  }

  const perCase: CaseMetric[] = [];
  let passAt1Count = 0;
  let passAtNCount = 0;
  let alwaysPassCases = 0;
  let flakyCases = 0;
  let alwaysFailCases = 0;

  for (const caseId of canonicalCaseIds) {
    const runs = runsByCase.get(caseId) ?? [];
    const repeatOne = runs.find((run) => run.repeatIndex === 1);
    const caseSuccessRuns = runs.reduce((acc, run) => acc + (run.success ? 1 : 0), 0);
    const caseFailedRuns = runs.length - caseSuccessRuns;
    const passAt1 = Boolean(repeatOne?.success);
    const passAtN = caseSuccessRuns > 0;

    if (passAt1) passAt1Count += 1;
    if (passAtN) passAtNCount += 1;

    let stability: CaseStability;
    if (caseSuccessRuns === 0) {
      stability = "always_fail";
      alwaysFailCases += 1;
    } else if (caseSuccessRuns === invocation.runsPerPrompt) {
      stability = "always_pass";
      alwaysPassCases += 1;
    } else {
      stability = "flaky";
      flakyCases += 1;
    }

    perCase.push({ caseId, successRuns: caseSuccessRuns, failedRuns: caseFailedRuns, passAt1, passAtN, stability, meanScore: null, exStatus: null });
  }

  // Failure breakdowns
  const byStageMap = new Map<FailureStageKey, number>();
  const byKindMap = new Map<string, number>();
  const byMessageMap = new Map<string, number>();

  for (const run of failedRuns) {
    const stage = run.failureStage ?? "unknown";
    byStageMap.set(stage, (byStageMap.get(stage) ?? 0) + 1);
    const kind = run.error?.kind ?? "unknown";
    byKindMap.set(kind, (byKindMap.get(kind) ?? 0) + 1);
    const message = normalizeErrorMessage(run.error?.message);
    byMessageMap.set(message, (byMessageMap.get(message) ?? 0) + 1);
  }

  const totalFailureCount = failedRuns.length;
  const byStage = Array.from(byStageMap.entries())
    .map(([stage, count]) => ({ stage, count, rate: totalFailureCount > 0 ? count / totalFailureCount : 0 }))
    .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage));

  const byKind = Array.from(byKindMap.entries())
    .map(([kind, count]) => ({ kind, count, rate: totalFailureCount > 0 ? count / totalFailureCount : 0 }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));

  const topMessages = Array.from(byMessageMap.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count || a.message.localeCompare(b.message))
    .slice(0, MAX_TOP_FAILURE_MESSAGES);

  // Latency
  const allDurations = invocation.runs.map((run) => run.durationMs);
  const successDurations = invocation.runs.filter((run) => run.success).map((run) => run.durationMs);
  const failureDurations = failedRuns.map((run) => run.durationMs);
  const allStats = computeDurationStats(allDurations)!;

  // Cost
  const traceStatusCounts: Record<TraceStatusKey, number> = {
    computed: 0, pending: 0, no_trace_id: 0, pricing_missing: 0, analysis_error: 0, missing: 0,
  };

  let totalCostUsd = 0;
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalReasoningTokens = 0;
  let totalCachedInputTokens = 0;
  let runsWithTraceId = 0;

  const perModelAgg = new Map<string, AggregatedModelCost>();

  for (const run of invocation.runs) {
    if (typeof run.traceId === "string" && run.traceId.trim().length > 0) {
      runsWithTraceId += 1;
    }

    const analysis = run.traceAnalysis;
    if (!analysis) {
      traceStatusCounts.missing += 1;
    } else {
      const status = analysis.status;
      if (status in traceStatusCounts) {
        traceStatusCounts[status as TraceStatusKey] += 1;
      }
      const costUsd = analysis.totals.costUsd;
      if (typeof costUsd === "number" && Number.isFinite(costUsd)) {
        totalCostUsd += costUsd;
      }
      const tokens = analysis.totals.totalTokens;
      if (typeof tokens === "number" && Number.isFinite(tokens)) {
        totalTokens += tokens;
      }
      totalInputTokens += analysis.totals.inputTokens;
      totalOutputTokens += analysis.totals.outputTokens;
      totalReasoningTokens += analysis.totals.reasoningTokens;
      totalCachedInputTokens += analysis.totals.cachedInputTokens;

      for (const pm of analysis.perModel) {
        const existing = perModelAgg.get(pm.modelKey);
        if (existing) {
          existing.calls += pm.calls;
          existing.inputTokens += pm.inputTokens;
          existing.outputTokens += pm.outputTokens;
          existing.totalTokens += pm.totalTokens;
          existing.cachedInputTokens += pm.cachedInputTokens;
          existing.reasoningTokens += pm.reasoningTokens;
          existing.costUsd += (typeof pm.costUsd === "number" && Number.isFinite(pm.costUsd)) ? pm.costUsd : 0;
        } else {
          perModelAgg.set(pm.modelKey, {
            modelKey: pm.modelKey,
            calls: pm.calls,
            inputTokens: pm.inputTokens,
            outputTokens: pm.outputTokens,
            totalTokens: pm.totalTokens,
            cachedInputTokens: pm.cachedInputTokens,
            reasoningTokens: pm.reasoningTokens,
            costUsd: (typeof pm.costUsd === "number" && Number.isFinite(pm.costUsd)) ? pm.costUsd : 0,
          });
        }
      }
    }
  }

  const perModel = Array.from(perModelAgg.values()).sort((a, b) => b.costUsd - a.costUsd || a.modelKey.localeCompare(b.modelKey));
  const totalCalls = perModel.reduce((acc, m) => acc + m.calls, 0);

  // Grading metrics
  const grading = computeGradingMetrics(invocation, canonicalCaseIds);

  // Backfill per-case grading data
  if (grading.available) {
    for (const caseMetric of perCase) {
      const caseQuality = grading.perCase.find((q) => q.caseId === caseMetric.caseId);
      if (caseQuality) {
        caseMetric.meanScore = caseQuality.meanScore;
        caseMetric.exStatus = caseQuality.exStatus;
      }
    }
  }

  return {
    approachId: invocation.experimentName,
    invocationDir: invocation.invocationDir,
    selector: invocation.selectorResolved,
    invocationPath: invocation.invocationPathAbs,
    runCount: invocation.runs.length,
    caseCount: canonicalCaseIds.length,
    runsPerPrompt: invocation.runsPerPrompt,
    runSuccess: toRateWithCi(successRuns, invocation.runs.length),
    passAt1: toRateWithCi(passAt1Count, canonicalCaseIds.length),
    passAtN: toRateWithCi(passAtNCount, canonicalCaseIds.length),
    failures: { count: totalFailureCount, byStage, byKind, topMessages },
    stability: { alwaysPassCases, flakyCases, alwaysFailCases },
    latencyMs: {
      all: allStats,
      success: computeDurationStats(successDurations),
      failure: computeDurationStats(failureDurations),
      allDurations,
      successDurations,
    },
    cost: {
      totalUsd: totalCostUsd,
      perRunUsd: invocation.runs.length > 0 ? totalCostUsd / invocation.runs.length : 0,
      perSuccessfulRunUsd: successRuns > 0 ? totalCostUsd / successRuns : null,
      totalTokens,
      tokensPerSuccessfulRun: successRuns > 0 ? totalTokens / successRuns : null,
      totalInputTokens,
      totalOutputTokens,
      totalReasoningTokens,
      totalCachedInputTokens,
      totalCalls,
      perModel,
      traceIdCoverageRate: invocation.runs.length > 0 ? runsWithTraceId / invocation.runs.length : 0,
      traceStatusCounts,
    },
    grading,
    perCase,
  };
}

export function buildCaseComparison(
  caseIds: string[],
  approaches: ApproachMetrics[],
): CaseComparisonRow[] {
  return caseIds.map((caseId) => {
    const rows: CaseApproachRow[] = approaches.map((approach) => {
      const metric = approach.perCase.find((entry) => entry.caseId === caseId);
      if (!metric) {
        return {
          approachId: approach.approachId,
          passAt1: false,
          passAtN: false,
          successRuns: 0,
          failedRuns: approach.runsPerPrompt,
          stability: "always_fail" as CaseStability,
          meanScore: null,
          exStatus: null,
        };
      }
      return {
        approachId: approach.approachId,
        passAt1: metric.passAt1,
        passAtN: metric.passAtN,
        successRuns: metric.successRuns,
        failedRuns: metric.failedRuns,
        stability: metric.stability,
        meanScore: metric.meanScore,
        exStatus: metric.exStatus,
      };
    });
    return { caseId, approaches: rows };
  });
}

export function ensureComparableInvocations(invocations: LoadedInvocation[]): {
  caseIds: string[];
  runsPerPrompt: number;
} {
  const baseline = invocations[0];
  if (!baseline) {
    throw new Error("No invocation selected for comparison.");
  }

  const baselineCaseIds = baseline.caseIds;
  const baselineSet = new Set(baselineCaseIds);
  const baselineRunsPerPrompt = baseline.runsPerPrompt;

  for (const current of invocations.slice(1)) {
    if (current.runsPerPrompt !== baselineRunsPerPrompt) {
      throw new Error(
        `Incompatible runsPerPrompt. ${baseline.selectorResolved}=${baselineRunsPerPrompt}, ${current.selectorResolved}=${current.runsPerPrompt}.`,
      );
    }

    const currentSet = new Set(current.caseIds);
    if (currentSet.size !== baselineSet.size) {
      throw new Error(
        `Incompatible case sets between ${baseline.selectorResolved} and ${current.selectorResolved}.`,
      );
    }

    for (const caseId of baselineSet) {
      if (!currentSet.has(caseId)) {
        throw new Error(
          `Case '${caseId}' is missing in ${current.selectorResolved}.`,
        );
      }
    }
  }

  return { caseIds: baselineCaseIds, runsPerPrompt: baselineRunsPerPrompt };
}
