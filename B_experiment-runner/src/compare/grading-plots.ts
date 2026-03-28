import type { VegaSpec } from "../types.ts";
import type { ApproachMetrics, CaseComparisonRow } from "./metrics.ts";
import { computeWilsonCi } from "./metrics.ts";
import type { GradingMetricsAvailable } from "./grading-metrics.ts";

interface GradingPlotMetrics {
  k: number;
  approaches: ApproachMetrics[];
  perCase: CaseComparisonRow[];
}

function getAvailableGrading(approach: ApproachMetrics): GradingMetricsAvailable | null {
  return approach.grading.available ? approach.grading : null;
}

export function buildScoreDistributionPlot(metrics: GradingPlotMetrics): VegaSpec | null {
  const values: Array<Record<string, unknown>> = [];
  let hasData = false;

  for (const approach of metrics.approaches) {
    const grading = getAvailableGrading(approach);
    if (!grading?.human) continue;
    hasData = true;

    for (const level of [1, 2, 3, 4, 5] as const) {
      values.push({
        approach: approach.approachId,
        score: String(level),
        count: grading.human.scoreDistribution[level],
      });
    }
  }

  if (!hasData) return null;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Score distribution by approach",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      xOffset: { field: "score" },
      y: { field: "count", type: "quantitative", title: "Count" },
      color: {
        field: "score",
        type: "nominal",
        title: "Score",
        scale: { domain: ["1", "2", "3", "4", "5"], range: ["#dc3545", "#fd7e14", "#ffc107", "#198754", "#0d6efd"] },
      },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "score", type: "nominal" },
        { field: "count", type: "quantitative" },
      ],
    },
  };
}

export function buildIssueFrequencyPlot(metrics: GradingPlotMetrics): VegaSpec | null {
  // Collect all issue tags across approaches, pick top 10
  const totals = new Map<string, number>();
  let hasData = false;

  for (const approach of metrics.approaches) {
    const grading = getAvailableGrading(approach);
    if (!grading?.human) continue;
    hasData = true;
    for (const [tag, count] of Object.entries(grading.human.issueFrequency)) {
      totals.set(tag, (totals.get(tag) ?? 0) + count);
    }
  }

  if (!hasData) return null;

  const topTags = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map((e) => e[0]);

  if (topTags.length === 0) return null;

  const values: Array<Record<string, unknown>> = [];
  for (const approach of metrics.approaches) {
    const grading = getAvailableGrading(approach);
    const freq = grading?.human?.issueFrequency ?? {};
    for (const tag of topTags) {
      values.push({ approach: approach.approachId, issue: tag, count: freq[tag] ?? 0 });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Top issue tag frequency by approach",
    width: 900,
    height: 420,
    data: { values },
    mark: "bar",
    encoding: {
      x: { field: "issue", type: "nominal", title: "Issue Tag" },
      xOffset: { field: "approach" },
      y: { field: "count", type: "quantitative", title: "Count" },
      color: { field: "approach", type: "nominal", title: "Approach" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "issue", type: "nominal" },
        { field: "count", type: "quantitative" },
      ],
    },
  };
}

export function buildExRatePlot(metrics: GradingPlotMetrics): VegaSpec | null {
  const singleMetric = metrics.k === 1;
  const values: Array<Record<string, unknown>> = [];
  let hasData = false;

  for (const approach of metrics.approaches) {
    const grading = getAvailableGrading(approach);
    if (!grading?.executionAccuracy) continue;
    hasData = true;

    const ea = grading.executionAccuracy;

    // EX rate (of evaluated) — conditional on having golden SQL and successful execution
    values.push({
      approach: approach.approachId,
      metric: "EX rate (evaluated)",
      rate: ea.exRate.rate,
      ciLow: ea.exRate.ci95.low,
      ciHigh: ea.exRate.ci95.high,
    });

    // EX rate (of all cases) — absolute rate for fair cross-approach comparison
    const absoluteCi = computeWilsonCi(ea.matchCount, approach.caseCount);
    values.push({
      approach: approach.approachId,
      metric: "EX rate (all cases)",
      rate: approach.caseCount > 0 ? ea.matchCount / approach.caseCount : 0,
      ciLow: absoluteCi.low,
      ciHigh: absoluteCi.high,
    });

    values.push({
      approach: approach.approachId,
      metric: "EX pass@1",
      rate: ea.exPassAt1.rate,
      ciLow: ea.exPassAt1.ci95.low,
      ciHigh: ea.exPassAt1.ci95.high,
    });
    if (!singleMetric) {
      values.push({
        approach: approach.approachId,
        metric: `EX pass@${metrics.k}`,
        rate: ea.exPassAtK.rate,
        ciLow: ea.exPassAtK.ci95.low,
        ciHigh: ea.exPassAtK.ci95.high,
      });
    }
  }

  if (!hasData) return null;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Execution accuracy (EX) rates by approach",
    width: 900,
    height: 420,
    data: { values },
    layer: [
      {
        mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: {
          x: { field: "approach", type: "nominal", title: "Approach" },
          xOffset: { field: "metric" },
          y: { field: "rate", type: "quantitative", title: "Rate", axis: { format: ".0%" }, scale: { domain: [0, 1] } },
          color: { field: "metric", type: "nominal", title: "Metric" },
          tooltip: [
            { field: "approach", type: "nominal" },
            { field: "metric", type: "nominal" },
            { field: "rate", type: "quantitative", format: ".2%" },
            { field: "ciLow", type: "quantitative", format: ".2%", title: "CI low" },
            { field: "ciHigh", type: "quantitative", format: ".2%", title: "CI high" },
          ],
        },
      },
      {
        mark: { type: "rule", strokeWidth: 2 },
        encoding: {
          x: { field: "approach", type: "nominal" },
          xOffset: { field: "metric" },
          y: { field: "ciLow", type: "quantitative" },
          y2: { field: "ciHigh" },
          color: { field: "metric", type: "nominal" },
        },
      },
    ],
  };
}

export function buildQualityHeatmap(metrics: GradingPlotMetrics): VegaSpec | null {
  let hasData = false;

  // Compute average score per case for sorting
  const caseAvgScores = new Map<string, number>();
  for (const row of metrics.perCase) {
    const scores = row.approaches
      .map((a) => a.meanScore)
      .filter((s): s is number => s !== null);
    if (scores.length > 0) {
      hasData = true;
      caseAvgScores.set(row.caseId, scores.reduce((a, b) => a + b, 0) / scores.length);
    } else {
      caseAvgScores.set(row.caseId, 0);
    }
  }

  if (!hasData) return null;

  const sortedCases = [...metrics.perCase].sort((a, b) => {
    const sa = caseAvgScores.get(a.caseId) ?? 0;
    const sb = caseAvgScores.get(b.caseId) ?? 0;
    return sb - sa || a.caseId.localeCompare(b.caseId);
  });

  const caseOrder = sortedCases.map((r) => r.caseId);

  const values: Array<Record<string, unknown>> = [];
  for (const row of sortedCases) {
    for (const approach of row.approaches) {
      values.push({
        caseId: row.caseId,
        approach: approach.approachId,
        meanScore: approach.meanScore,
      });
    }
  }

  const caseCount = caseOrder.length;
  const height = Math.max(420, caseCount * 6);

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Mean quality score heatmap (case x approach)",
    width: 900,
    height,
    data: { values },
    mark: "rect",
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      y: { field: "caseId", type: "ordinal", title: null, axis: null, sort: caseOrder },
      color: {
        field: "meanScore",
        type: "quantitative",
        title: "Mean Score",
        scale: { domain: [1, 5], range: ["#dc3545", "#ffc107", "#198754"] },
      },
      tooltip: [
        { field: "caseId", type: "nominal" },
        { field: "approach", type: "nominal" },
        { field: "meanScore", type: "quantitative", format: ".2f" },
      ],
    },
  };
}

export function buildQualityVsCostPlot(metrics: GradingPlotMetrics): VegaSpec | null {
  const values: Array<Record<string, unknown>> = [];
  let hasData = false;

  for (const approach of metrics.approaches) {
    const grading = getAvailableGrading(approach);
    if (!grading?.human) continue;
    hasData = true;

    values.push({
      approach: approach.approachId,
      meanScore: grading.human.meanScore,
      costPerRunUsd: approach.cost.perRunUsd,
      totalCostUsd: approach.cost.totalUsd,
    });
  }

  if (!hasData) return null;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Quality vs cost trade-off",
    width: 900,
    height: 420,
    data: { values },
    layer: [
      {
        mark: { type: "point", filled: true, size: 180 },
        encoding: {
          x: { field: "meanScore", type: "quantitative", title: "Mean Quality Score", scale: { domain: [1, 5] } },
          y: { field: "costPerRunUsd", type: "quantitative", title: "Cost per run (USD)" },
          color: { field: "approach", type: "nominal", title: "Approach" },
          size: { field: "totalCostUsd", type: "quantitative", title: "Total cost (USD)" },
          tooltip: [
            { field: "approach", type: "nominal" },
            { field: "meanScore", type: "quantitative", format: ".2f" },
            { field: "costPerRunUsd", type: "quantitative", format: ".4f" },
            { field: "totalCostUsd", type: "quantitative", format: ".4f" },
          ],
        },
      },
      {
        mark: { type: "text", dy: -12, fontSize: 11 },
        encoding: {
          x: { field: "meanScore", type: "quantitative" },
          y: { field: "costPerRunUsd", type: "quantitative" },
          text: { field: "approach", type: "nominal" },
          color: { value: "#111" },
        },
      },
    ],
  };
}
