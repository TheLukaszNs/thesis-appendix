import path from "node:path";
import { mkdir } from "node:fs/promises";

import { UserInputError } from "../errors.ts";
import type { VegaSpec } from "../types.ts";
import { toDisplayPath, toInvocationDirName, toUtcIso } from "../utils.ts";
import { writeJson } from "../artifacts/writer.ts";
import { normalizeVegaSpec, resolveVegaSpecWithQueryData } from "../viz/normalize.ts";
import { renderVegaSpecToPng } from "../viz/renderer.ts";
import {
  resolveSelector,
  tryLoadInvocation,
  type LoadedInvocation,
  type IncompleteInvocation,
  type SelectorResolution,
} from "./loader.ts";
import {
  computeApproachMetrics,
  buildCaseComparison,
  ensureComparableInvocations,
  type ApproachMetrics,
  type CaseComparisonRow,
} from "./metrics.ts";
import {
  buildPassRatesPlot,
  buildRunSuccessPlot,
  buildCasePassHeatmap,
  buildFailureStagePlot,
  buildLatencyRangePlot,
  buildCostVsSuccessPlot,
  buildTopFailureKindPlot,
  buildTokenBreakdownPlot,
  buildModelCallsPlot,
  buildCaseAgreementPlot,
  buildCostEfficiencyPlot,
  buildLatencyCdfPlot,
  buildEfficiencyComparisonPlot,
} from "./plots.ts";
import {
  buildScoreDistributionPlot,
  buildIssueFrequencyPlot,
  buildExRatePlot,
  buildQualityHeatmap,
  buildQualityVsCostPlot,
} from "./grading-plots.ts";
import { buildReportMarkdown, type CompareMetricsForReport } from "./report.ts";
import { buildAllLatexTables } from "./latex.ts";

const COMPARE_SCHEMA_VERSION = "agent-runner/compare/v2" as const;
const DEFAULT_OUT_DIR = "./results/analysis";

interface GeneratedPlot {
  id: string;
  title: string;
  pngPath: string;
  specPath: string;
}

export interface CompareExperimentsParams {
  targets: string[];
  outDir?: string;
  verbose?: boolean;
  quiet?: boolean;
}

export interface CompareExperimentsOutcome {
  outputRootAbs: string;
  outputRootDisplay: string;
  manifestPath: string;
  metricsPath: string;
  reportPath: string;
  plots: GeneratedPlot[];
  texPaths: string[];
  selectedTargets: string[];
  skippedTargets: number;
}

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stats = await Bun.file(targetPath).exists();
    // Bun.file().exists() works for files; for directories use stat
    const { stat: statFn } = await import("node:fs/promises");
    const s = await statFn(targetPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function prepareOutputRoot(
  outDirRaw: string,
): Promise<{
  outputRootAbs: string;
  outputRootDisplay: string;
  manifestPath: string;
  metricsPath: string;
  reportPath: string;
  plotsDir: string;
}> {
  const outDirAbs = path.resolve(process.cwd(), outDirRaw);
  await mkdir(outDirAbs, { recursive: true });

  const baseName = toInvocationDirName(toUtcIso());
  let candidate = path.join(outDirAbs, baseName);
  let suffix = 1;

  while (await directoryExists(candidate)) {
    candidate = path.join(outDirAbs, `${baseName}-${String(suffix).padStart(2, "0")}`);
    suffix += 1;
  }

  await mkdir(candidate, { recursive: true });
  const plotsDir = path.join(candidate, "plots");
  await mkdir(plotsDir, { recursive: true });

  return {
    outputRootAbs: candidate,
    outputRootDisplay: toDisplayPath(candidate),
    manifestPath: path.join(candidate, "compare-manifest.json"),
    metricsPath: path.join(candidate, "metrics.json"),
    reportPath: path.join(candidate, "report.md"),
    plotsDir,
  };
}

async function writePlot(params: {
  plotsDir: string;
  id: string;
  title: string;
  spec: VegaSpec;
}): Promise<GeneratedPlot> {
  const specPath = path.join(params.plotsDir, `${params.id}.vega.json`);
  const pngPath = path.join(params.plotsDir, `${params.id}.png`);

  try {
    await renderVegaSpecToPng(params.spec, specPath, pngPath);
  } catch (error) {
    // If vl2png fails, still write the spec for manual inspection
    await writeJson(specPath, params.spec);
    console.error(`Warning: Failed to render plot '${params.id}': ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    id: params.id,
    title: params.title,
    pngPath,
    specPath,
  };
}

export async function compareExperiments(
  params: CompareExperimentsParams,
): Promise<CompareExperimentsOutcome> {
  const logger = {
    info: (message: string) => { if (!params.quiet) console.log(message); },
    verbose: (message: string) => { if (!params.quiet && params.verbose) console.log(message); },
    warning: (payload: Record<string, unknown>) => { console.error(JSON.stringify(payload)); },
  };

  const resultsRootAbs = path.join(process.cwd(), "experiments");

  const targets = params.targets
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (targets.length === 0) {
    throw new UserInputError("Provide at least one --target.");
  }

  // Deduplicate
  const uniqueTargets = [...new Set(targets)];

  logger.verbose(`Resolving ${uniqueTargets.length} target selectors...`);

  const resolutions: SelectorResolution[] = [];
  for (const target of uniqueTargets) {
    resolutions.push(await resolveSelector(target, resultsRootAbs));
  }

  // Deduplicate by path
  const resolutionsByPath = new Map<string, SelectorResolution>();
  for (const resolution of resolutions) {
    if (!resolutionsByPath.has(resolution.invocationPathAbs)) {
      resolutionsByPath.set(resolution.invocationPathAbs, resolution);
    }
  }

  const orderedResolutions = Array.from(resolutionsByPath.values()).sort((a, b) =>
    a.resolvedSelector.localeCompare(b.resolvedSelector),
  );

  const selectedInvocations: LoadedInvocation[] = [];
  const skippedTargets: Array<{ selector: SelectorResolution; incomplete: IncompleteInvocation }> = [];

  for (const resolution of orderedResolutions) {
    const loaded = await tryLoadInvocation(resolution);
    if (loaded.loaded) {
      selectedInvocations.push(loaded.loaded);
    } else {
      const incomplete = loaded.incomplete ?? { reason: "unknown" };
      skippedTargets.push({ selector: resolution, incomplete });
      logger.warning({
        event: "incomplete_invocation_skipped",
        target: resolution.input,
        reason: incomplete.reason,
        details: incomplete.details,
      });
    }
  }

  if (selectedInvocations.length === 0) {
    throw new UserInputError("No complete invocations selected after filtering.");
  }

  const comparability = ensureComparableInvocations(selectedInvocations);

  logger.verbose(
    `Loaded ${selectedInvocations.length} invocation(s) with ${comparability.caseIds.length} cases and k=${comparability.runsPerPrompt}.`,
  );

  const approaches = selectedInvocations
    .map((inv) => computeApproachMetrics(inv, comparability.caseIds))
    .sort((a, b) => a.approachId.localeCompare(b.approachId));

  const perCase = buildCaseComparison(comparability.caseIds, approaches);

  const metricsData: CompareMetricsForReport & { schemaVersion: string } = {
    schemaVersion: COMPARE_SCHEMA_VERSION,
    generatedAtUtc: toUtcIso(),
    k: comparability.runsPerPrompt,
    caseIds: comparability.caseIds,
    approaches,
    perCase,
    rankings: {
      byPassAtN: [...approaches]
        .sort((a, b) => b.passAtN.rate - a.passAtN.rate || a.approachId.localeCompare(b.approachId))
        .map((a) => ({ approachId: a.approachId, value: a.passAtN.rate })),
      byRunSuccess: [...approaches]
        .sort((a, b) => b.runSuccess.rate - a.runSuccess.rate || a.approachId.localeCompare(b.approachId))
        .map((a) => ({ approachId: a.approachId, value: a.runSuccess.rate })),
      byCostPerSuccessfulRun: [...approaches]
        .sort((a, b) => {
          const av = a.cost.perSuccessfulRunUsd;
          const bv = b.cost.perSuccessfulRunUsd;
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return av - bv;
        })
        .map((a) => ({ approachId: a.approachId, value: a.cost.perSuccessfulRunUsd })),
      byMeanScore: [...approaches]
        .filter((a) => a.grading.available && a.grading.human !== null)
        .sort((a, b) => {
          const av = a.grading.available ? a.grading.human?.meanScore ?? 0 : 0;
          const bv = b.grading.available ? b.grading.human?.meanScore ?? 0 : 0;
          return bv - av || a.approachId.localeCompare(b.approachId);
        })
        .map((a) => ({ approachId: a.approachId, value: a.grading.available ? a.grading.human?.meanScore ?? null : null })),
      byExRate: [...approaches]
        .filter((a) => a.grading.available && a.grading.executionAccuracy !== null)
        .sort((a, b) => {
          const av = a.grading.available ? a.grading.executionAccuracy?.exRate.rate ?? 0 : 0;
          const bv = b.grading.available ? b.grading.executionAccuracy?.exRate.rate ?? 0 : 0;
          return bv - av || a.approachId.localeCompare(b.approachId);
        })
        .map((a) => ({ approachId: a.approachId, value: a.grading.available ? a.grading.executionAccuracy?.exRate.rate ?? null : null })),
    },
  };

  const output = await prepareOutputRoot(params.outDir ?? DEFAULT_OUT_DIR);

  // Write manifest
  const manifest = {
    schemaVersion: COMPARE_SCHEMA_VERSION,
    generatedAtUtc: metricsData.generatedAtUtc,
    outputRoot: output.outputRootDisplay,
    input: { targets: uniqueTargets },
    selectedTargets: selectedInvocations.map((inv) => ({
      selector: inv.selectorInput,
      resolvedSelector: inv.selectorResolved,
      invocationPath: toDisplayPath(inv.invocationPathAbs),
    })),
    skippedTargets: skippedTargets.map((s) => ({
      selector: s.selector.input,
      resolvedSelector: s.selector.resolvedSelector,
      reason: s.incomplete.reason,
      details: s.incomplete.details,
    })),
  };

  await writeJson(output.manifestPath, manifest);
  await writeJson(output.metricsPath, metricsData);

  // Generate plots
  const plotMetrics = { k: comparability.runsPerPrompt, approaches, perCase };
  const plots: GeneratedPlot[] = [];

  const plotSpecs: Array<{ id: string; title: string; spec: VegaSpec }> = [
    { id: "pass-rates", title: "pass@1 and pass@k", spec: buildPassRatesPlot(plotMetrics) },
    { id: "run-success", title: "run success", spec: buildRunSuccessPlot(plotMetrics) },
    { id: "case-pass-heatmap", title: "case pass heatmap", spec: buildCasePassHeatmap(plotMetrics) },
    { id: "failure-stage", title: "failure stage distribution", spec: buildFailureStagePlot(plotMetrics) },
    { id: "top-failure-kind", title: "top failure kind", spec: buildTopFailureKindPlot(plotMetrics) },
    { id: "latency-range", title: "latency distribution", spec: buildLatencyRangePlot(plotMetrics) },
    { id: "cost-vs-success", title: "cost vs success", spec: buildCostVsSuccessPlot(plotMetrics) },
    { id: "case-agreement", title: "case agreement", spec: buildCaseAgreementPlot(plotMetrics) },
    { id: "latency-cdf", title: "latency CDF", spec: buildLatencyCdfPlot(plotMetrics) },
  ];

  // Conditional plots (null = skip)
  const conditionalPlotCandidates: Array<{ id: string; title: string; spec: VegaSpec | null }> = [
    { id: "token-breakdown", title: "token breakdown", spec: buildTokenBreakdownPlot(plotMetrics) },
    { id: "model-calls", title: "model API calls", spec: buildModelCallsPlot(plotMetrics) },
    { id: "cost-efficiency", title: "cost-efficiency Pareto", spec: buildCostEfficiencyPlot(plotMetrics) },
    { id: "efficiency-comparison", title: "efficiency comparison", spec: buildEfficiencyComparisonPlot(plotMetrics) },
  ];

  for (const candidate of conditionalPlotCandidates) {
    if (candidate.spec !== null) {
      plotSpecs.push({ id: candidate.id, title: candidate.title, spec: candidate.spec });
    }
  }

  // Grading plots (only added if data exists)
  const gradingPlotCandidates: Array<{ id: string; title: string; spec: VegaSpec | null }> = [
    { id: "score-distribution", title: "score distribution", spec: buildScoreDistributionPlot(plotMetrics) },
    { id: "issue-frequency", title: "issue frequency", spec: buildIssueFrequencyPlot(plotMetrics) },
    { id: "ex-rate", title: "execution accuracy rates", spec: buildExRatePlot(plotMetrics) },
    { id: "quality-heatmap", title: "quality score heatmap", spec: buildQualityHeatmap(plotMetrics) },
    { id: "quality-vs-cost", title: "quality vs cost", spec: buildQualityVsCostPlot(plotMetrics) },
  ];

  for (const candidate of gradingPlotCandidates) {
    if (candidate.spec !== null) {
      plotSpecs.push({ id: candidate.id, title: candidate.title, spec: candidate.spec });
    }
  }

  for (const plotSpec of plotSpecs) {
    plots.push(
      await writePlot({
        plotsDir: output.plotsDir,
        id: plotSpec.id,
        title: plotSpec.title,
        spec: plotSpec.spec,
      }),
    );
  }

  // Generate markdown report
  const report = buildReportMarkdown({
    metrics: metricsData,
    selectedTargets: selectedInvocations,
    skippedTargets,
  });
  await Bun.write(output.reportPath, report);

  // Generate LaTeX tables
  const latexDir = path.join(output.outputRootAbs, "latex");
  await mkdir(latexDir, { recursive: true });

  const latexTables = buildAllLatexTables({
    approaches,
    perCase,
    rankings: metricsData.rankings,
    k: comparability.runsPerPrompt,
  });

  const texPaths: string[] = [];
  for (const table of latexTables) {
    const texPath = path.join(latexDir, table.filename);
    await Bun.write(texPath, table.content);
    texPaths.push(texPath);
    logger.verbose(`Wrote LaTeX table: ${table.filename}`);
  }

  logger.info(`Comparison complete. Output: ${output.outputRootDisplay}`);

  return {
    outputRootAbs: output.outputRootAbs,
    outputRootDisplay: output.outputRootDisplay,
    manifestPath: output.manifestPath,
    metricsPath: output.metricsPath,
    reportPath: output.reportPath,
    plots,
    texPaths,
    selectedTargets: selectedInvocations.map((inv) => inv.selectorResolved),
    skippedTargets: skippedTargets.length,
  };
}
