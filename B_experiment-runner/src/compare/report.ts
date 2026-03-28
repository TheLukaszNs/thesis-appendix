import type { ApproachMetrics, CaseComparisonRow } from "./metrics.ts";
import type { LoadedInvocation, IncompleteInvocation, SelectorResolution } from "./loader.ts";
import type { GradingMetricsAvailable } from "./grading-metrics.ts";

export interface CompareMetricsForReport {
  generatedAtUtc: string;
  k: number;
  caseIds: string[];
  approaches: ApproachMetrics[];
  perCase: CaseComparisonRow[];
  rankings: {
    byPassAtN: Array<{ approachId: string; value: number }>;
    byRunSuccess: Array<{ approachId: string; value: number }>;
    byCostPerSuccessfulRun: Array<{ approachId: string; value: number | null }>;
    byMeanScore?: Array<{ approachId: string; value: number | null }>;
    byExRate?: Array<{ approachId: string; value: number | null }>;
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatUsd(value: number | null): string {
  if (value === null) return "n/a";
  return `$${value.toFixed(4)}`;
}

function formatNumber(value: number | null): string {
  if (value === null) return "n/a";
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value}`;
}

export function buildReportMarkdown(params: {
  metrics: CompareMetricsForReport;
  selectedTargets: LoadedInvocation[];
  skippedTargets: Array<{ selector: SelectorResolution; incomplete: IncompleteInvocation }>;
}): string {
  const { metrics } = params;
  const bestByPassAtN = metrics.rankings.byPassAtN[0];
  const slowest = [...metrics.approaches].sort(
    (a, b) => b.latencyMs.all.p95Ms - a.latencyMs.all.p95Ms,
  )[0];

  const allFailureKinds = new Map<string, number>();
  for (const approach of metrics.approaches) {
    for (const item of approach.failures.byKind) {
      allFailureKinds.set(item.kind, (allFailureKinds.get(item.kind) ?? 0) + item.count);
    }
  }
  const topFailureKind = Array.from(allFailureKinds.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .at(0);

  const lines: string[] = [];

  lines.push("# Multi-Experiment Comparison Report");
  lines.push("");
  lines.push(`Generated at: ${metrics.generatedAtUtc}`);
  lines.push(`Compared approaches: ${metrics.approaches.length}`);
  lines.push(`Cases: ${metrics.caseIds.length}`);
  lines.push(`Runs per case (k): ${metrics.k}`);
  lines.push("");

  lines.push("## Selected Targets");
  lines.push("");
  for (const target of params.selectedTargets) {
    lines.push(`- ${target.selectorResolved} (${target.invocationPathAbs})`);
  }

  if (params.skippedTargets.length > 0) {
    lines.push("");
    lines.push("## Skipped Targets");
    lines.push("");
    for (const skipped of params.skippedTargets) {
      const details = skipped.incomplete.details ? ` (${skipped.incomplete.details})` : "";
      lines.push(`- ${skipped.selector.input} -> ${skipped.selector.resolvedSelector}: ${skipped.incomplete.reason}${details}`);
    }
  }

  lines.push("");
  lines.push("## Approach Summary");
  lines.push("");
  lines.push("| Approach | pass@1 | pass@k | run success | fail runs | p95 latency (ms) | total cost (USD) | cost/success (USD) |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");

  for (const approach of metrics.approaches) {
    lines.push(
      `| ${approach.approachId} | ${formatPercent(approach.passAt1.rate)} | ${formatPercent(approach.passAtN.rate)} | ${formatPercent(approach.runSuccess.rate)} | ${approach.failures.count} | ${Math.round(approach.latencyMs.all.p95Ms)} | ${approach.cost.totalUsd.toFixed(4)} | ${formatUsd(approach.cost.perSuccessfulRunUsd)} |`,
    );
  }

  lines.push("");
  lines.push("## Key Findings");
  lines.push("");

  if (bestByPassAtN) {
    lines.push(`- Best pass@k: **${bestByPassAtN.approachId}** (${formatPercent(bestByPassAtN.value)}).`);
  }
  if (slowest) {
    lines.push(`- Slowest p95 latency: **${slowest.approachId}** (${Math.round(slowest.latencyMs.all.p95Ms)} ms).`);
  }
  if (topFailureKind) {
    lines.push(`- Most frequent failure kind: **${topFailureKind[0]}** (${topFailureKind[1]} runs).`);
  } else {
    lines.push("- No failed runs in selected approaches.");
  }

  lines.push("");
  lines.push("## Failure Diagnostics");
  lines.push("");

  for (const approach of metrics.approaches) {
    lines.push(`### ${approach.approachId}`);
    if (approach.failures.count === 0) {
      lines.push("");
      lines.push("No failed runs.");
      lines.push("");
      continue;
    }
    lines.push("");
    lines.push("Failure stages:");
    for (const stage of approach.failures.byStage) {
      lines.push(`- ${stage.stage}: ${stage.count} (${formatPercent(stage.rate)})`);
    }
    lines.push("");
    lines.push("Top failure kinds:");
    for (const kind of approach.failures.byKind.slice(0, 5)) {
      lines.push(`- ${kind.kind}: ${kind.count} (${formatPercent(kind.rate)})`);
    }
    if (approach.failures.topMessages.length > 0) {
      lines.push("");
      lines.push("Top failure messages:");
      for (const msg of approach.failures.topMessages.slice(0, 5)) {
        lines.push(`- ${msg.count}x: ${msg.message}`);
      }
    }
    lines.push("");
  }

  lines.push("## Stability, Latency, and Cost");
  lines.push("");
  for (const approach of metrics.approaches) {
    lines.push(`### ${approach.approachId}`);
    lines.push("");
    lines.push(`- Stability: always_pass=${approach.stability.alwaysPassCases}, flaky=${approach.stability.flakyCases}, always_fail=${approach.stability.alwaysFailCases}`);
    lines.push(`- Latency (all runs): min=${Math.round(approach.latencyMs.all.minMs)} ms, p50=${Math.round(approach.latencyMs.all.p50Ms)} ms, p95=${Math.round(approach.latencyMs.all.p95Ms)} ms, max=${Math.round(approach.latencyMs.all.maxMs)} ms`);
    lines.push(`- Cost: total=${formatUsd(approach.cost.totalUsd)}, per_run=${formatUsd(approach.cost.perRunUsd)}, per_success=${formatUsd(approach.cost.perSuccessfulRunUsd)}, tokens_per_success=${formatNumber(approach.cost.tokensPerSuccessfulRun)}`);
    lines.push(`- Trace coverage: ${formatPercent(approach.cost.traceIdCoverageRate)} (traceId present).`);
    lines.push("");
  }

  // Token and model usage — only if trace data exists
  const hasTraceData = metrics.approaches.some((a) => a.cost.totalCalls > 0);
  if (hasTraceData) {
    lines.push("## Token and Model Usage");
    lines.push("");
    lines.push("| Approach | API Calls | Input Tokens | Output Tokens | Reasoning Tokens | Cached Input | Models |");
    lines.push("|---|---:|---:|---:|---:|---:|---|");

    for (const approach of metrics.approaches) {
      const models = approach.cost.perModel.map((m) => m.modelKey).join(", ") || "n/a";
      lines.push(
        `| ${approach.approachId} | ${approach.cost.totalCalls} | ${formatTokenCount(approach.cost.totalInputTokens)} | ${formatTokenCount(approach.cost.totalOutputTokens)} | ${formatTokenCount(approach.cost.totalReasoningTokens)} | ${formatTokenCount(approach.cost.totalCachedInputTokens)} | ${models} |`,
      );
    }
    lines.push("");
  }

  // Grading sections — only rendered if at least one approach has data
  const gradingApproaches = metrics.approaches
    .map((a) => ({ approach: a, grading: a.grading.available ? a.grading as GradingMetricsAvailable : null }))
    .filter((a) => a.grading !== null);

  if (gradingApproaches.some((a) => a.grading?.human !== null)) {
    lines.push("## Human Evaluation");
    lines.push("");
    lines.push("| Approach | Graded | Coverage | Mean | Median | Acceptable+ (>=3) | Good+ (>=4) | Issues/Run |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");

    for (const approach of metrics.approaches) {
      const grading = approach.grading.available ? approach.grading as GradingMetricsAvailable : null;
      const human = grading?.human;
      if (!human) {
        lines.push(`| ${approach.approachId} | N/A | N/A | N/A | N/A | N/A | N/A | N/A |`);
        continue;
      }
      lines.push(
        `| ${approach.approachId} | ${human.gradedCount}/${human.totalRuns} | ${formatPercent(human.coverageRate)} | ${human.meanScore.toFixed(2)} | ${human.medianScore.toFixed(1)} | ${formatPercent(human.acceptablePlusRate.rate)} | ${formatPercent(human.goodPlusRate.rate)} | ${human.issueDensity.toFixed(2)} |`,
      );
    }
    lines.push("");
  }

  if (gradingApproaches.some((a) => a.grading?.executionAccuracy !== null)) {
    lines.push("## Execution Accuracy");
    lines.push("");
    lines.push("| Approach | Evaluated | EX Rate | EX pass@1 | EX pass@k | Row Count Accuracy |");
    lines.push("|---|---:|---:|---:|---:|---:|");

    for (const approach of metrics.approaches) {
      const grading = approach.grading.available ? approach.grading as GradingMetricsAvailable : null;
      const ea = grading?.executionAccuracy;
      if (!ea) {
        lines.push(`| ${approach.approachId} | N/A | N/A | N/A | N/A | N/A |`);
        continue;
      }
      lines.push(
        `| ${approach.approachId} | ${ea.evaluatedCount} | ${formatPercent(ea.exRate.rate)} | ${formatPercent(ea.exPassAt1.rate)} | ${formatPercent(ea.exPassAtK.rate)} | ${formatPercent(ea.rowCountAccuracyRate.rate)} |`,
      );
    }
    lines.push("");

    // Absolute EX rate context
    const absoluteNotes: string[] = [];
    for (const approach of metrics.approaches) {
      const grading = approach.grading.available ? approach.grading as GradingMetricsAvailable : null;
      const ea = grading?.executionAccuracy;
      if (ea) {
        const absRate = approach.caseCount > 0 ? ea.matchCount / approach.caseCount : 0;
        absoluteNotes.push(`- **${approach.approachId}**: ${ea.matchCount}/${approach.caseCount} cases match (${formatPercent(absRate)} absolute EX rate)`);
      }
    }
    if (absoluteNotes.length > 0) {
      lines.push("Absolute EX rate (matches / total cases, independent of evaluation coverage):");
      lines.push("");
      lines.push(...absoluteNotes);
      lines.push("");
    }
  }

  if (gradingApproaches.some((a) => a.grading?.sqlValidity !== null)) {
    lines.push("## SQL Structural Validity");
    lines.push("");
    lines.push("| Approach | Checked | Validity Rate | invalid_table | invalid_column | syntax_error | zero_rows |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|");

    for (const approach of metrics.approaches) {
      const grading = approach.grading.available ? approach.grading as GradingMetricsAvailable : null;
      const sv = grading?.sqlValidity;
      if (!sv) {
        lines.push(`| ${approach.approachId} | N/A | N/A | N/A | N/A | N/A | N/A |`);
        continue;
      }
      const errorTypes = ["invalid_table", "invalid_column", "syntax_error", "zero_rows"];
      const errorCells = errorTypes.map((t) => {
        const et = sv.perErrorType[t];
        return et ? `${et.count}` : "0";
      });
      lines.push(
        `| ${approach.approachId} | ${sv.checkedCount} | ${formatPercent(sv.validityRate.rate)} | ${errorCells.join(" | ")} |`,
      );
    }
    lines.push("");
  }

  if (gradingApproaches.some((a) => a.grading?.combined !== null)) {
    lines.push("## Combined Quality Metrics");
    lines.push("");
    lines.push("| Approach | Quality-Adjusted Success Rate |");
    lines.push("|---|---:|");

    for (const approach of metrics.approaches) {
      const grading = approach.grading.available ? approach.grading as GradingMetricsAvailable : null;
      const combined = grading?.combined;
      if (!combined) {
        lines.push(`| ${approach.approachId} | N/A |`);
        continue;
      }
      lines.push(
        `| ${approach.approachId} | ${formatPercent(combined.qualityAdjustedSuccessRate.rate)} |`,
      );
    }
    lines.push("");
  }

  // Extended key findings for grading
  const gradingFindings: string[] = [];

  const bestByMeanScore = metrics.rankings.byMeanScore?.[0];
  if (bestByMeanScore && bestByMeanScore.value !== null) {
    gradingFindings.push(`- Best mean quality score: **${bestByMeanScore.approachId}** (${(bestByMeanScore.value as number).toFixed(2)}).`);
  }

  const bestByExRate = metrics.rankings.byExRate?.[0];
  if (bestByExRate && bestByExRate.value !== null) {
    gradingFindings.push(`- Best EX rate: **${bestByExRate.approachId}** (${formatPercent(bestByExRate.value as number)}).`);
  }

  // Most common issue tag across all approaches
  const allIssueCounts = new Map<string, number>();
  for (const { grading } of gradingApproaches) {
    if (grading?.human) {
      for (const [tag, count] of Object.entries(grading.human.issueFrequency)) {
        allIssueCounts.set(tag, (allIssueCounts.get(tag) ?? 0) + count);
      }
    }
  }
  const topIssueTag = Array.from(allIssueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .at(0);
  if (topIssueTag) {
    gradingFindings.push(`- Most common issue tag: **${topIssueTag[0]}** (${topIssueTag[1]} occurrences).`);
  }

  if (gradingFindings.length > 0) {
    lines.push("## Grading Findings");
    lines.push("");
    lines.push(...gradingFindings);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
