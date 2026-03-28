import type { VegaSpec } from "../types.ts";
import type { ApproachMetrics, CaseComparisonRow } from "./metrics.ts";

type FailureStageKey = "sql" | "viz" | "e2e" | "unknown";

export interface CompareMetricsForPlots {
  k: number;
  approaches: ApproachMetrics[];
  perCase: CaseComparisonRow[];
}

export function buildPassRatesPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const singleMetric = metrics.k === 1;
  const values: Array<Record<string, unknown>> = [];

  for (const approach of metrics.approaches) {
    values.push({
      approach: approach.approachId,
      metric: "pass@1",
      rate: approach.passAt1.rate,
      ciLow: approach.passAt1.ci95.low,
      ciHigh: approach.passAt1.ci95.high,
    });
    if (!singleMetric) {
      values.push({
        approach: approach.approachId,
        metric: `pass@${metrics.k}`,
        rate: approach.passAtN.rate,
        ciLow: approach.passAtN.ci95.low,
        ciHigh: approach.passAtN.ci95.high,
      });
    }
  }

  const barEncoding: Record<string, unknown> = {
    x: { field: "approach", type: "nominal", title: "Approach" },
    y: { field: "rate", type: "quantitative", title: "Rate", axis: { format: ".0%" }, scale: { domain: [0, 1] } },
    tooltip: [
      { field: "approach", type: "nominal" },
      { field: "metric", type: "nominal" },
      { field: "rate", type: "quantitative", format: ".2%" },
      { field: "ciLow", type: "quantitative", format: ".2%", title: "CI low" },
      { field: "ciHigh", type: "quantitative", format: ".2%", title: "CI high" },
    ],
  };

  const ruleEncoding: Record<string, unknown> = {
    x: { field: "approach", type: "nominal" },
    y: { field: "ciLow", type: "quantitative" },
    y2: { field: "ciHigh" },
  };

  if (singleMetric) {
    barEncoding.color = { value: "#1f77b4" };
  } else {
    barEncoding.xOffset = { field: "metric" };
    barEncoding.color = { field: "metric", type: "nominal", title: "Metric" };
    ruleEncoding.xOffset = { field: "metric" };
    ruleEncoding.color = { field: "metric", type: "nominal" };
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: singleMetric ? "pass@1 by approach" : "pass@1 and pass@k by approach",
    width: 900,
    height: 420,
    data: { values },
    layer: [
      {
        mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: barEncoding,
      },
      {
        mark: { type: "rule", strokeWidth: 2 },
        encoding: ruleEncoding,
      },
    ],
  };
}

export function buildRunSuccessPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const values = metrics.approaches.map((approach) => ({
    approach: approach.approachId,
    rate: approach.runSuccess.rate,
    ciLow: approach.runSuccess.ci95.low,
    ciHigh: approach.runSuccess.ci95.high,
  }));

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Run success rate by approach",
    width: 900,
    height: 420,
    data: { values },
    layer: [
      {
        mark: { type: "bar", color: "#1f77b4", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: {
          x: { field: "approach", type: "nominal", title: "Approach" },
          y: { field: "rate", type: "quantitative", title: "Run success", axis: { format: ".0%" }, scale: { domain: [0, 1] } },
          tooltip: [
            { field: "approach", type: "nominal" },
            { field: "rate", type: "quantitative", format: ".2%" },
            { field: "ciLow", type: "quantitative", format: ".2%", title: "CI low" },
            { field: "ciHigh", type: "quantitative", format: ".2%", title: "CI high" },
          ],
        },
      },
      {
        mark: { type: "rule", color: "#0f4c81", strokeWidth: 2 },
        encoding: {
          x: { field: "approach", type: "nominal" },
          y: { field: "ciLow", type: "quantitative" },
          y2: { field: "ciHigh" },
        },
      },
    ],
  };
}

export function buildCasePassHeatmap(metrics: CompareMetricsForPlots): VegaSpec {
  // Compute pass count per case for sorting (failures cluster at bottom)
  const casePassCounts = new Map<string, number>();
  for (const row of metrics.perCase) {
    const passCount = row.approaches.reduce((acc, a) => acc + (a.passAtN ? 1 : 0), 0);
    casePassCounts.set(row.caseId, passCount);
  }

  const sortedCases = [...metrics.perCase].sort((a, b) => {
    const pa = casePassCounts.get(a.caseId) ?? 0;
    const pb = casePassCounts.get(b.caseId) ?? 0;
    return pb - pa || a.caseId.localeCompare(b.caseId);
  });

  const caseOrder = sortedCases.map((r) => r.caseId);

  const values: Array<Record<string, unknown>> = [];
  for (const row of sortedCases) {
    for (const approach of row.approaches) {
      values.push({
        caseId: row.caseId,
        approach: approach.approachId,
        passAtN: approach.passAtN ? 1 : 0,
      });
    }
  }

  const caseCount = caseOrder.length;
  const height = Math.max(420, caseCount * 6);

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Case-level pass@k heatmap",
    width: 900,
    height,
    data: { values },
    mark: "rect",
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      y: { field: "caseId", type: "ordinal", title: null, axis: null, sort: caseOrder },
      color: {
        field: "passAtN",
        type: "quantitative",
        title: `pass@${metrics.k}`,
        scale: { domain: [0, 1], range: ["#f8d7da", "#198754"] },
      },
      tooltip: [
        { field: "caseId", type: "nominal" },
        { field: "approach", type: "nominal" },
        { field: "passAtN", type: "quantitative", format: ".0f" },
      ],
    },
  };
}

export function buildFailureStagePlot(metrics: CompareMetricsForPlots): VegaSpec {
  const stages: FailureStageKey[] = ["sql", "viz", "e2e", "unknown"];
  const values: Array<Record<string, unknown>> = [];

  for (const approach of metrics.approaches) {
    const byStage = new Map<string, number>(approach.failures.byStage.map((item) => [item.stage, item.count]));
    for (const stage of stages) {
      values.push({ approach: approach.approachId, stage, count: byStage.get(stage) ?? 0 });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Failure points by stage",
    width: 900,
    height: 420,
    data: { values },
    mark: "bar",
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      y: { field: "count", type: "quantitative", title: "Failed runs" },
      color: { field: "stage", type: "nominal", title: "Failure stage" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "stage", type: "nominal" },
        { field: "count", type: "quantitative" },
      ],
    },
  };
}

export function buildLatencyMarkersPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const values: Array<Record<string, unknown>> = [];

  for (const approach of metrics.approaches) {
    for (const [marker, value] of [
      ["min", approach.latencyMs.all.minMs],
      ["p50", approach.latencyMs.all.p50Ms],
      ["p95", approach.latencyMs.all.p95Ms],
      ["max", approach.latencyMs.all.maxMs],
      ["mean", approach.latencyMs.all.meanMs],
    ] as const) {
      values.push({ approach: approach.approachId, durationMs: value, marker });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Latency summary markers",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "point", filled: true, size: 120 },
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      y: { field: "durationMs", type: "quantitative", title: "Duration (ms)" },
      color: { field: "marker", type: "nominal", title: "Statistic" },
      shape: { field: "marker", type: "nominal" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "marker", type: "nominal" },
        { field: "durationMs", type: "quantitative", format: ".0f" },
      ],
    },
  };
}

export function buildCostVsSuccessPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const values = metrics.approaches.map((approach) => ({
    approach: approach.approachId,
    runSuccessRate: approach.runSuccess.rate,
    costPerRunUsd: approach.cost.perRunUsd,
    costPerSuccessfulRunUsd: approach.cost.perSuccessfulRunUsd,
    totalCostUsd: approach.cost.totalUsd,
  }));

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Cost vs success trade-off",
    width: 900,
    height: 420,
    data: { values },
    layer: [
      {
        mark: { type: "point", filled: true, size: 180 },
        encoding: {
          x: { field: "runSuccessRate", type: "quantitative", title: "Run success rate", axis: { format: ".0%" }, scale: { domain: [0, 1] } },
          y: { field: "costPerRunUsd", type: "quantitative", title: "Cost per run (USD)" },
          color: { field: "approach", type: "nominal", title: "Approach" },
          size: { field: "totalCostUsd", type: "quantitative", title: "Total cost (USD)" },
          tooltip: [
            { field: "approach", type: "nominal" },
            { field: "runSuccessRate", type: "quantitative", format: ".2%" },
            { field: "costPerRunUsd", type: "quantitative", format: ".4f" },
            { field: "costPerSuccessfulRunUsd", type: "quantitative", format: ".4f", title: "Cost per success" },
            { field: "totalCostUsd", type: "quantitative", format: ".4f" },
          ],
        },
      },
      {
        mark: { type: "text", dy: -12, fontSize: 11 },
        encoding: {
          x: { field: "runSuccessRate", type: "quantitative" },
          y: { field: "costPerRunUsd", type: "quantitative" },
          text: { field: "approach", type: "nominal" },
          color: { value: "#111" },
        },
      },
    ],
  };
}

export function buildTopFailureKindPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const totals = new Map<string, number>();
  for (const approach of metrics.approaches) {
    for (const kind of approach.failures.byKind) {
      totals.set(kind.kind, (totals.get(kind.kind) ?? 0) + kind.count);
    }
  }

  const topKinds = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map((entry) => entry[0]);

  const values: Array<Record<string, unknown>> = [];
  for (const approach of metrics.approaches) {
    const map = new Map<string, number>(approach.failures.byKind.map((item) => [item.kind, item.count]));
    if (topKinds.length === 0) {
      values.push({ approach: approach.approachId, kind: "none", count: 0 });
    } else {
      for (const kind of topKinds) {
        values.push({ approach: approach.approachId, kind, count: map.get(kind) ?? 0 });
      }
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Top failure type enums (error.kind)",
    width: 900,
    height: 420,
    data: { values },
    mark: "bar",
    encoding: {
      x: { field: "kind", type: "nominal", title: "error.kind" },
      y: { field: "count", type: "quantitative", title: "Failed runs" },
      color: { field: "approach", type: "nominal", title: "Approach" },
      xOffset: { field: "approach" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "kind", type: "nominal" },
        { field: "count", type: "quantitative" },
      ],
    },
  };
}

export function buildLatencyRangePlot(metrics: CompareMetricsForPlots): VegaSpec {
  const values: Array<Record<string, unknown>> = [];

  for (const approach of metrics.approaches) {
    for (const duration of approach.latencyMs.allDurations) {
      values.push({ approach: approach.approachId, durationMs: duration });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Latency distribution by approach",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "boxplot", extent: "min-max" },
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      y: { field: "durationMs", type: "quantitative", title: "Duration (ms)" },
      color: { field: "approach", type: "nominal", title: "Approach", legend: null },
    },
  };
}

export function buildTokenBreakdownPlot(metrics: CompareMetricsForPlots): VegaSpec | null {
  const hasTraceData = metrics.approaches.some((a) => a.cost.totalCalls > 0);
  if (!hasTraceData) return null;

  const values: Array<Record<string, unknown>> = [];
  const categories = [
    { key: "Input", color: "#1f77b4" },
    { key: "Cached Input", color: "#aec7e8" },
    { key: "Output", color: "#ff7f0e" },
    { key: "Reasoning", color: "#d62728" },
  ] as const;

  for (const approach of metrics.approaches) {
    values.push({ approach: approach.approachId, category: "Input", tokens: approach.cost.totalInputTokens - approach.cost.totalCachedInputTokens });
    values.push({ approach: approach.approachId, category: "Cached Input", tokens: approach.cost.totalCachedInputTokens });
    values.push({ approach: approach.approachId, category: "Output", tokens: approach.cost.totalOutputTokens });
    values.push({ approach: approach.approachId, category: "Reasoning", tokens: approach.cost.totalReasoningTokens });
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Token breakdown by approach",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      y: { field: "tokens", type: "quantitative", title: "Tokens", stack: true },
      color: {
        field: "category",
        type: "nominal",
        title: "Token Type",
        scale: {
          domain: categories.map((c) => c.key),
          range: categories.map((c) => c.color),
        },
      },
      order: { field: "category" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "category", type: "nominal" },
        { field: "tokens", type: "quantitative", format: "," },
      ],
    },
  };
}

export function buildCaseAgreementPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const categoryCounts = new Map<string, number>();
  const approachIds = metrics.approaches.map((a) => a.approachId);

  for (const row of metrics.perCase) {
    const passing = row.approaches.filter((a) => a.passAtN).map((a) => a.approachId);

    let category: string;
    if (passing.length === approachIds.length) {
      category = "All pass";
    } else if (passing.length === 0) {
      category = "All fail";
    } else {
      category = passing.join(" + ");
    }
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  const sorted = Array.from(categoryCounts.entries()).sort((a, b) => {
    if (a[0] === "All pass") return -1;
    if (b[0] === "All pass") return 1;
    if (a[0] === "All fail") return 1;
    if (b[0] === "All fail") return -1;
    return b[1] - a[1];
  });

  const categoryOrder = sorted.map(([cat]) => cat);

  const values = sorted.map(([category, count]) => {
    let group: string;
    if (category === "All pass") group = "all_pass";
    else if (category === "All fail") group = "all_fail";
    else group = "partial";
    return { category, count, group };
  });

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Case agreement across approaches",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: { field: "category", type: "nominal", title: "Agreement", sort: categoryOrder },
      y: { field: "count", type: "quantitative", title: "Number of cases" },
      color: {
        field: "group",
        type: "nominal",
        title: "Agreement",
        scale: {
          domain: ["all_pass", "partial", "all_fail"],
          range: ["#198754", "#ffc107", "#dc3545"],
        },
        legend: null,
      },
      tooltip: [
        { field: "category", type: "nominal" },
        { field: "count", type: "quantitative" },
      ],
    },
  };
}

export function buildCostEfficiencyPlot(metrics: CompareMetricsForPlots): VegaSpec | null {
  const points = metrics.approaches
    .filter((a) => a.cost.totalCalls > 0 && a.cost.perSuccessfulRunUsd !== null)
    .map((a) => ({
      approach: a.approachId,
      passAt1: a.passAt1.rate,
      costPerSuccess: a.cost.perSuccessfulRunUsd!,
    }));

  if (points.length === 0) return null;

  // Compute Pareto frontier: sort by passAt1 desc, keep points where cost <= min cost seen
  const sortedByPass = [...points].sort((a, b) => b.passAt1 - a.passAt1);
  const frontier: typeof points = [];
  let minCost = Infinity;
  for (const p of sortedByPass) {
    if (p.costPerSuccess <= minCost) {
      frontier.push(p);
      minCost = p.costPerSuccess;
    }
  }

  const frontierData = frontier.map((p) => ({
    approach: p.approach,
    passAt1: p.passAt1,
    costPerSuccess: p.costPerSuccess,
  }));

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Cost-Efficiency Pareto frontier",
    width: 900,
    height: 420,
    layer: [
      {
        data: { values: frontierData },
        mark: { type: "line", strokeDash: [6, 4], color: "#999", strokeWidth: 1.5 },
        encoding: {
          x: { field: "passAt1", type: "quantitative", title: "pass@1 rate", axis: { format: ".0%" }, scale: { domain: [0, 1] } },
          y: { field: "costPerSuccess", type: "quantitative", title: "Cost per successful run (USD)" },
          order: { field: "passAt1", sort: "ascending" },
        },
      },
      {
        data: { values: points },
        mark: { type: "point", filled: true, size: 180 },
        encoding: {
          x: { field: "passAt1", type: "quantitative" },
          y: { field: "costPerSuccess", type: "quantitative" },
          color: { field: "approach", type: "nominal", title: "Approach" },
          tooltip: [
            { field: "approach", type: "nominal" },
            { field: "passAt1", type: "quantitative", format: ".2%", title: "pass@1" },
            { field: "costPerSuccess", type: "quantitative", format: "$.4f", title: "Cost/success" },
          ],
        },
      },
      {
        data: { values: points },
        mark: { type: "text", dy: -14, fontSize: 11 },
        encoding: {
          x: { field: "passAt1", type: "quantitative" },
          y: { field: "costPerSuccess", type: "quantitative" },
          text: { field: "approach", type: "nominal" },
          color: { value: "#111" },
        },
      },
    ],
  };
}

export function buildLatencyCdfPlot(metrics: CompareMetricsForPlots): VegaSpec {
  const values: Array<Record<string, unknown>> = [];

  for (const approach of metrics.approaches) {
    const sorted = [...approach.latencyMs.allDurations].sort((a, b) => a - b);
    const n = sorted.length;
    for (let i = 0; i < n; i++) {
      values.push({
        approach: approach.approachId,
        durationMs: sorted[i],
        cumulativeFraction: (i + 1) / n,
      });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Latency CDF by approach",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "line", interpolate: "step-after" },
    encoding: {
      x: { field: "durationMs", type: "quantitative", title: "Duration (ms)" },
      y: { field: "cumulativeFraction", type: "quantitative", title: "Cumulative fraction", axis: { format: ".0%" }, scale: { domain: [0, 1] } },
      color: { field: "approach", type: "nominal", title: "Approach" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "durationMs", type: "quantitative", format: ".0f", title: "Duration (ms)" },
        { field: "cumulativeFraction", type: "quantitative", format: ".2%", title: "Cumulative %" },
      ],
    },
  };
}

export function buildEfficiencyComparisonPlot(metrics: CompareMetricsForPlots): VegaSpec | null {
  const hasTraceData = metrics.approaches.some((a) => a.cost.totalCalls > 0);
  if (!hasTraceData) return null;

  type MetricDef = { metric: string; getter: (a: ApproachMetrics) => number | null };
  const metricDefs: MetricDef[] = [
    { metric: "Cost / success", getter: (a) => a.cost.perSuccessfulRunUsd },
    { metric: "Tokens / success", getter: (a) => a.cost.tokensPerSuccessfulRun },
    { metric: "API calls / run", getter: (a) => a.runCount > 0 ? a.cost.totalCalls / a.runCount : null },
  ];

  const values: Array<Record<string, unknown>> = [];

  for (const def of metricDefs) {
    const rawValues = metrics.approaches.map((a) => ({ approach: a.approachId, raw: def.getter(a) }));
    const validRaw = rawValues.filter((v) => v.raw !== null).map((v) => v.raw!);
    const maxVal = validRaw.length > 0 ? Math.max(...validRaw) : 1;

    for (const v of rawValues) {
      values.push({
        approach: v.approach,
        metric: def.metric,
        normalized: v.raw !== null && maxVal > 0 ? v.raw / maxVal : null,
        raw: v.raw,
      });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "Efficiency comparison (normalized, lower = better)",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: { field: "metric", type: "nominal", title: "Metric" },
      y: { field: "normalized", type: "quantitative", title: "Normalized value (0–1)", scale: { domain: [0, 1] } },
      xOffset: { field: "approach" },
      color: { field: "approach", type: "nominal", title: "Approach" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "metric", type: "nominal" },
        { field: "raw", type: "quantitative", format: ".4f", title: "Raw value" },
        { field: "normalized", type: "quantitative", format: ".3f", title: "Normalized" },
      ],
    },
  };
}

export function buildModelCallsPlot(metrics: CompareMetricsForPlots): VegaSpec | null {
  const hasTraceData = metrics.approaches.some((a) => a.cost.perModel.length > 0);
  if (!hasTraceData) return null;

  // Collect all model keys across approaches
  const allModels = new Set<string>();
  for (const approach of metrics.approaches) {
    for (const pm of approach.cost.perModel) {
      allModels.add(pm.modelKey);
    }
  }

  if (allModels.size === 0) return null;

  const values: Array<Record<string, unknown>> = [];
  for (const approach of metrics.approaches) {
    const modelMap = new Map(approach.cost.perModel.map((pm) => [pm.modelKey, pm.calls]));
    for (const model of allModels) {
      values.push({
        approach: approach.approachId,
        model,
        calls: modelMap.get(model) ?? 0,
      });
    }
  }

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: "API calls per model by approach",
    width: 900,
    height: 420,
    data: { values },
    mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: { field: "approach", type: "nominal", title: "Approach" },
      xOffset: { field: "model" },
      y: { field: "calls", type: "quantitative", title: "API Calls" },
      color: { field: "model", type: "nominal", title: "Model" },
      tooltip: [
        { field: "approach", type: "nominal" },
        { field: "model", type: "nominal" },
        { field: "calls", type: "quantitative" },
      ],
    },
  };
}
