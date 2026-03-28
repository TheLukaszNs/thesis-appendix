import type { ApproachMetrics, CaseComparisonRow } from "./metrics.ts";
import type { CompareMetricsForReport } from "./report.ts";
import type { GradingMetricsAvailable } from "./grading-metrics.ts";

export interface GeneratedLatexTable {
  id: string;
  filename: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function formatLatexPercent(rate: number, ci95?: { low: number; high: number }): string {
  const pct = `${(rate * 100).toFixed(1)}\\%`;
  if (ci95) {
    return `${pct} (${(ci95.low * 100).toFixed(1)}--${(ci95.high * 100).toFixed(1)})`;
  }
  return pct;
}

function formatLatexUsd(value: number | null): string {
  if (value === null) return "---";
  return `\\$${value.toFixed(4)}`;
}

function formatLatexMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatLatexTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function bold(text: string): string {
  return `\\textbf{${text}}`;
}

/**
 * Given an array of numeric-ish values (one per approach), return the index
 * of the best one. `lower=true` means lower is better (cost), `lower=false`
 * means higher is better (rate).
 */
function bestIndex(values: (number | null)[], lower: boolean): number {
  let best = -1;
  let bestVal: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? null;
    if (v === null) continue;
    if (bestVal === null || (lower ? v < bestVal : v > bestVal)) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Table 1: Main Comparison
// ---------------------------------------------------------------------------

function buildComparisonTable(approaches: ApproachMetrics[], k: number): string {
  const hasGrading = approaches.some(
    (a) => a.grading.available && (a.grading as GradingMetricsAvailable).executionAccuracy !== null,
  );

  const lines: string[] = [];
  lines.push("% Requires: \\usepackage{booktabs}");
  lines.push("\\begin{table}[htbp]");
  lines.push("\\centering");
  lines.push(`\\caption{Comparison of NL-to-SQL approaches (pass@${k})}`);
  lines.push("\\label{tab:comparison}");

  const colSpec = hasGrading ? "lrrrrrrr" : "lrrrrrr";
  lines.push(`\\begin{tabular}{${colSpec}}`);
  lines.push("\\toprule");

  const headers = ["Approach", `pass@1 (CI)`, ...(hasGrading ? ["EX Rate"] : []), "Cost/Run", "Cost/Success", "p50 Lat.", "p95 Lat.", "API Calls"];
  lines.push(`${headers.join(" & ")} \\\\`);
  lines.push("\\midrule");

  // Precompute columns for bolding
  const passAt1Values = approaches.map((a) => a.passAt1.rate);
  const exRateValues = approaches.map((a) => {
    if (!a.grading.available) return null;
    const g = a.grading as GradingMetricsAvailable;
    return g.executionAccuracy?.exRate.rate ?? null;
  });
  const costPerRunValues = approaches.map((a) => a.cost.perRunUsd);
  const costPerSuccessValues = approaches.map((a) => a.cost.perSuccessfulRunUsd);
  const p50Values = approaches.map((a) => a.latencyMs.all.p50Ms);
  const p95Values = approaches.map((a) => a.latencyMs.all.p95Ms);
  const apiCallValues = approaches.map((a) => a.cost.totalCalls);

  const bestPassAt1 = bestIndex(passAt1Values, false);
  const bestExRate = bestIndex(exRateValues, false);
  const bestCostPerRun = bestIndex(costPerRunValues, true);
  const bestCostPerSuccess = bestIndex(costPerSuccessValues, true);
  const bestP50 = bestIndex(p50Values, true);
  const bestP95 = bestIndex(p95Values, true);
  const bestApiCalls = bestIndex(apiCallValues, true);

  for (let i = 0; i < approaches.length; i++) {
    const a = approaches[i]!;
    const cells: string[] = [];

    cells.push(escapeLatex(a.approachId));

    const passAt1Cell = formatLatexPercent(a.passAt1.rate, a.passAt1.ci95);
    cells.push(i === bestPassAt1 ? bold(passAt1Cell) : passAt1Cell);

    if (hasGrading) {
      const exRate = exRateValues[i] ?? null;
      const exCell = exRate !== null ? formatLatexPercent(exRate) : "---";
      cells.push(i === bestExRate ? bold(exCell) : exCell);
    }

    const costRunCell = formatLatexUsd(a.cost.perRunUsd);
    cells.push(i === bestCostPerRun ? bold(costRunCell) : costRunCell);

    const costSuccessCell = formatLatexUsd(a.cost.perSuccessfulRunUsd);
    cells.push(i === bestCostPerSuccess ? bold(costSuccessCell) : costSuccessCell);

    const p50Cell = formatLatexMs(a.latencyMs.all.p50Ms);
    cells.push(i === bestP50 ? bold(p50Cell) : p50Cell);

    const p95Cell = formatLatexMs(a.latencyMs.all.p95Ms);
    cells.push(i === bestP95 ? bold(p95Cell) : p95Cell);

    const apiCell = `${a.cost.totalCalls}`;
    cells.push(i === bestApiCalls ? bold(apiCell) : apiCell);

    lines.push(`${cells.join(" & ")} \\\\`);
  }

  lines.push("\\bottomrule");
  lines.push("\\end{tabular}");
  lines.push("\\end{table}");

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Table 2: Per-Case Results Matrix
// ---------------------------------------------------------------------------

function buildPerCaseTable(perCase: CaseComparisonRow[], approaches: ApproachMetrics[]): string {
  const approachIds = approaches.map((a) => a.approachId);
  const hasExData = approaches.some(
    (a) => a.grading.available && (a.grading as GradingMetricsAvailable).executionAccuracy !== null,
  );

  // Sort by total pass count descending
  const sorted = [...perCase].sort((a, b) => {
    const aPass = a.approaches.reduce((acc, ap) => acc + (ap.passAtN ? 1 : 0), 0);
    const bPass = b.approaches.reduce((acc, ap) => acc + (ap.passAtN ? 1 : 0), 0);
    return bPass - aPass || a.caseId.localeCompare(b.caseId);
  });

  const lines: string[] = [];
  lines.push("% Requires: \\usepackage{booktabs, longtable, amssymb}");

  // Build column spec: l for case ID + per approach: c (pass) + optionally c (EX)
  const colsPerApproach = hasExData ? "cc" : "c";
  const colSpec = `l${colsPerApproach.repeat(approachIds.length)}`;

  lines.push(`\\begin{longtable}{${colSpec}}`);
  lines.push("\\caption{Per-case results across approaches}");
  lines.push("\\label{tab:per-case} \\\\");
  lines.push("\\toprule");

  // Header row
  const headerCells = ["Case ID"];
  for (const id of approachIds) {
    if (hasExData) {
      headerCells.push(`\\multicolumn{2}{c}{${escapeLatex(id)}}`);
    } else {
      headerCells.push(escapeLatex(id));
    }
  }
  lines.push(`${headerCells.join(" & ")} \\\\`);

  if (hasExData) {
    const subHeader = [""];
    for (const _ of approachIds) {
      subHeader.push("Pass", "EX");
    }
    lines.push(`${subHeader.join(" & ")} \\\\`);
  }

  lines.push("\\midrule");
  lines.push("\\endfirsthead");

  // Continuation header
  lines.push("\\toprule");
  lines.push(`${headerCells.join(" & ")} \\\\`);
  if (hasExData) {
    const subHeader = [""];
    for (const _ of approachIds) {
      subHeader.push("Pass", "EX");
    }
    lines.push(`${subHeader.join(" & ")} \\\\`);
  }
  lines.push("\\midrule");
  lines.push("\\endhead");

  lines.push("\\bottomrule");
  lines.push("\\endfoot");

  for (const row of sorted) {
    const cells: string[] = [escapeLatex(row.caseId)];

    for (const approachId of approachIds) {
      const approachRow = row.approaches.find((a) => a.approachId === approachId);
      const pass = approachRow?.passAtN ?? false;
      cells.push(pass ? "$\\checkmark$" : "$\\times$");

      if (hasExData) {
        const exStatus = approachRow?.exStatus;
        if (exStatus === "match") cells.push("$\\checkmark$");
        else if (exStatus === "mismatch") cells.push("$\\times$");
        else cells.push("---");
      }
    }

    lines.push(`${cells.join(" & ")} \\\\`);
  }

  lines.push("\\end{longtable}");

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Table 3: Token/Cost Breakdown
// ---------------------------------------------------------------------------

function buildTokenBreakdownTable(approaches: ApproachMetrics[]): string | null {
  const hasTraceData = approaches.some((a) => a.cost.perModel.length > 0);
  if (!hasTraceData) return null;

  const lines: string[] = [];
  lines.push("% Requires: \\usepackage{booktabs}");
  lines.push("\\begin{table}[htbp]");
  lines.push("\\centering");
  lines.push("\\caption{Token and cost breakdown by model}");
  lines.push("\\label{tab:token-breakdown}");
  lines.push("\\begin{tabular}{llrrrrrrrr}");
  lines.push("\\toprule");
  lines.push("Approach & Model & Input & Cached & Output & Reasoning & Total & Cost & Cost/Run & Cost/Succ. \\\\");
  lines.push("\\midrule");

  for (const a of approaches) {
    if (a.cost.perModel.length === 0) {
      lines.push(`${escapeLatex(a.approachId)} & --- & --- & --- & --- & --- & --- & --- & ${formatLatexUsd(a.cost.perRunUsd)} & ${formatLatexUsd(a.cost.perSuccessfulRunUsd)} \\\\`);
      continue;
    }

    for (let j = 0; j < a.cost.perModel.length; j++) {
      const pm = a.cost.perModel[j]!;
      const approachCell = j === 0 ? escapeLatex(a.approachId) : "";
      const costRunCell = j === 0 ? formatLatexUsd(a.cost.perRunUsd) : "";
      const costSuccessCell = j === 0 ? formatLatexUsd(a.cost.perSuccessfulRunUsd) : "";

      lines.push(
        `${approachCell} & ${escapeLatex(pm.modelKey)} & ${formatLatexTokens(pm.inputTokens)} & ${formatLatexTokens(pm.cachedInputTokens)} & ${formatLatexTokens(pm.outputTokens)} & ${formatLatexTokens(pm.reasoningTokens)} & ${formatLatexTokens(pm.totalTokens)} & ${formatLatexUsd(pm.costUsd)} & ${costRunCell} & ${costSuccessCell} \\\\`,
      );
    }
  }

  lines.push("\\bottomrule");
  lines.push("\\end{tabular}");
  lines.push("\\end{table}");

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Table 4: Rankings
// ---------------------------------------------------------------------------

function buildRankingsTable(
  approaches: ApproachMetrics[],
  rankings: CompareMetricsForReport["rankings"],
): string {
  const lines: string[] = [];
  lines.push("% Requires: \\usepackage{booktabs}");
  lines.push("\\begin{table}[htbp]");
  lines.push("\\centering");
  lines.push("\\caption{Metric rankings across approaches}");
  lines.push("\\label{tab:rankings}");

  const maxRank = Math.min(approaches.length, 3);
  const rankHeaders = Array.from({ length: maxRank }, (_, i) => ordinal(i + 1));

  lines.push(`\\begin{tabular}{l${"l".repeat(maxRank)}}`);
  lines.push("\\toprule");
  lines.push(`Metric & ${rankHeaders.join(" & ")} \\\\`);
  lines.push("\\midrule");

  type RankingRow = { label: string; entries: Array<{ approachId: string; value: number | null }> };
  const rankingRows: RankingRow[] = [
    { label: `pass@k`, entries: rankings.byPassAtN },
    { label: "Run Success", entries: rankings.byRunSuccess },
    { label: "Cost/Success", entries: rankings.byCostPerSuccessfulRun },
  ];

  if (rankings.byExRate && rankings.byExRate.length > 0) {
    rankingRows.push({ label: "EX Rate", entries: rankings.byExRate });
  }
  if (rankings.byMeanScore && rankings.byMeanScore.length > 0) {
    rankingRows.push({ label: "Mean Score", entries: rankings.byMeanScore });
  }

  for (const row of rankingRows) {
    const cells: string[] = [row.label];
    for (let i = 0; i < maxRank; i++) {
      const entry = row.entries[i];
      if (!entry) {
        cells.push("---");
        continue;
      }
      const formatted = formatRankValue(row.label, entry.value);
      const cell = `${escapeLatex(entry.approachId)} (${formatted})`;
      cells.push(i === 0 ? bold(cell) : cell);
    }
    lines.push(`${cells.join(" & ")} \\\\`);
  }

  lines.push("\\bottomrule");
  lines.push("\\end{tabular}");
  lines.push("\\end{table}");

  return lines.join("\n") + "\n";
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function formatRankValue(metricLabel: string, value: number | null): string {
  if (value === null) return "---";
  if (metricLabel === "Cost/Success") return formatLatexUsd(value);
  if (metricLabel === "Mean Score") return value.toFixed(2);
  return formatLatexPercent(value);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function buildAllLatexTables(params: {
  approaches: ApproachMetrics[];
  perCase: CaseComparisonRow[];
  rankings: CompareMetricsForReport["rankings"];
  k: number;
}): GeneratedLatexTable[] {
  const tables: GeneratedLatexTable[] = [];

  tables.push({
    id: "comparison-table",
    filename: "comparison-table.tex",
    content: buildComparisonTable(params.approaches, params.k),
  });

  tables.push({
    id: "per-case-results",
    filename: "per-case-results.tex",
    content: buildPerCaseTable(params.perCase, params.approaches),
  });

  const tokenTable = buildTokenBreakdownTable(params.approaches);
  if (tokenTable !== null) {
    tables.push({
      id: "token-breakdown",
      filename: "token-breakdown.tex",
      content: tokenTable,
    });
  }

  tables.push({
    id: "rankings",
    filename: "rankings.tex",
    content: buildRankingsTable(params.approaches, params.rankings),
  });

  return tables;
}
