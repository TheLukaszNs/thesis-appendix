import type {
  ExperimentConfig,
  ExecutionOutcome,
  FailureStage,
  ManifestArtifact,
  PricingCatalog,
  PromptCase,
  RunArtifact,
  SummaryArtifact,
} from "../types.ts";
import { ARTIFACT_SCHEMA_VERSION } from "../types.ts";
import { buildCaseDirectoryMap, percentile, toUtcIso } from "../utils.ts";
import { prepareOutputLayout } from "../artifacts/layout.ts";
import { prepareRunFilePaths } from "../artifacts/paths.ts";
import { writeJson, writeText } from "../artifacts/writer.ts";
import { createProgressReporter } from "./progress.ts";
import { TaskPool } from "./pool.ts";
import { executeRunTask } from "./task.ts";
import { analyzeTrace } from "../trace/analyzer.ts";
import { loadPricingCatalog } from "../config/pricing.ts";
import { buildTraceAnalysisSummary, buildTraceCostReport } from "../trace/report.ts";
import { BunSqlTraceSpanStore } from "../trace/store-bun-sql.ts";
import type { TraceSpanStore } from "../trace/store.ts";

interface Logger {
  info: (message: string) => void;
  verbose: (message: string) => void;
  errorJson: (payload: Record<string, unknown>) => void;
}

function createLogger(opts: { quiet: boolean; verbose: boolean }): Logger {
  return {
    info: (message: string) => {
      if (!opts.quiet) console.log(message);
    },
    verbose: (message: string) => {
      if (!opts.quiet && opts.verbose) console.log(message);
    },
    errorJson: (payload: Record<string, unknown>) => {
      console.error(JSON.stringify(payload));
    },
  };
}

function computeSummaryDurations(values: number[]): SummaryArtifact["durationMs"] {
  if (values.length === 0) {
    return { minMs: 0, maxMs: 0, meanMs: 0, p50Ms: 0, p95Ms: 0 };
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    meanMs: sum / values.length,
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
  };
}

interface ExecutionTask {
  promptCase: PromptCase;
  caseDirectory: string;
  repeatIndex: number;
}

interface BufferedFailure {
  caseId: string;
  repeatIndex: number;
  runsPerPrompt: number;
  failureStage?: FailureStage;
  errorKind?: string;
  errorMessage?: string;
}

function printFailureSummary(failures: BufferedFailure[], logger: Logger): void {
  if (failures.length === 0) return;

  logger.info("");
  logger.info("Failed runs:");

  for (const f of failures) {
    const stage = f.failureStage
      ? `${f.failureStage}/${f.errorKind ?? "unknown"}`
      : f.errorKind ?? "unknown";
    const msg = f.errorMessage ?? "";
    logger.info(
      `  ${f.caseId.padEnd(24)} run ${f.repeatIndex}/${f.runsPerPrompt}  ${stage.padEnd(16)} ${msg}`,
    );
  }
}

export async function executeExperiment(params: {
  config: ExperimentConfig;
  promptCases: PromptCase[];
  verbose: boolean;
  quiet: boolean;
}): Promise<ExecutionOutcome> {
  const { config, promptCases } = params;
  const logger = createLogger({ quiet: params.quiet, verbose: params.verbose });
  const invocationAtUtc = toUtcIso();

  const caseDirectoryMap = buildCaseDirectoryMap(
    promptCases.map((pc) => pc.id),
  );

  const layout = await prepareOutputLayout(config, invocationAtUtc);
  const plannedRuns = promptCases.length * config.execution.repetitions;

  logger.info(`Output directory: ${layout.rootDisplay}`);
  logger.info(`Planned runs: ${plannedRuns} (${promptCases.length} cases x ${config.execution.repetitions} reps, concurrency=${config.execution.concurrency})`);

  // Copy config to output
  const configFile = Bun.file(layout.configCopyPath);
  // We'll just note that the config was used; writing a YAML copy requires the raw content
  // which we don't have here. Instead, write a JSON summary.

  // Build manifest
  const manifest: ManifestArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    experimentName: config.name,
    createdAtUtc: invocationAtUtc,
    workflowId: config.api.workflowId,
    baseUrl: config.api.baseUrl,
    timeoutMs: config.api.timeoutMs,
    runsPerPrompt: config.execution.repetitions,
    concurrency: config.execution.concurrency,
    outputRoot: layout.rootDisplay,
    testsetPath: config.testset,
    thesis: config.metadata,
    plannedRuns,
    completedRuns: 0,
    failedRuns: 0,
    cases: promptCases.map((pc) => ({
      id: pc.id,
      caseDirectory: caseDirectoryMap.get(pc.id) ?? pc.id,
    })),
  };

  await writeJson(layout.manifestPath, manifest);

  // Build task list
  const tasks: ExecutionTask[] = [];
  for (const promptCase of promptCases) {
    const caseDirectory = caseDirectoryMap.get(promptCase.id) ?? promptCase.id;
    for (let repeatIndex = 1; repeatIndex <= config.execution.repetitions; repeatIndex++) {
      tasks.push({ promptCase, caseDirectory, repeatIndex });
    }
  }

  // Set up trace analysis
  let traceStore: TraceSpanStore | undefined;
  let closeTraceStore = false;
  let pricingCatalog: PricingCatalog | undefined;
  let pricingCatalogVersion = "unknown";
  let traceAnalysisStartupError: string | undefined;

  if (config.trace.enabled) {
    try {
      pricingCatalog = loadPricingCatalog();
      pricingCatalogVersion = pricingCatalog.version;
      traceStore = new BunSqlTraceSpanStore(config.trace.database);
      closeTraceStore = true;
    } catch (error) {
      traceAnalysisStartupError = error instanceof Error ? error.message : String(error);
      // Trace startup errors happen before the bar starts, so logging directly is fine
      logger.errorJson({
        event: "trace_analysis_startup_error",
        message: traceAnalysisStartupError,
      });
    }
  }

  const progress = createProgressReporter({ quiet: params.quiet, verbose: params.verbose });
  const pool = new TaskPool<ExecutionTask>(config.execution.concurrency);

  const failureByStage: Record<FailureStage, number> = { sql: 0, viz: 0, e2e: 0 };
  const perCase = new Map<string, {
    caseDirectory: string;
    plannedRuns: number;
    successRuns: number;
    failedRuns: number;
  }>();

  for (const pc of promptCases) {
    perCase.set(pc.id, {
      caseDirectory: caseDirectoryMap.get(pc.id) ?? pc.id,
      plannedRuns: config.execution.repetitions,
      successRuns: 0,
      failedRuns: 0,
    });
  }

  const durationValues: number[] = [];
  const runArtifacts: RunArtifact[] = [];
  const bufferedFailures: BufferedFailure[] = [];
  let completedRuns = 0;
  let failedRuns = 0;
  let successRuns = 0;

  // Show initial bar state
  progress.tick({ completedRuns: 0, plannedRuns, successRuns: 0, failedRuns: 0 });

  try {
    await pool.map(tasks, async (task, index) => {
      const runOrdinal = index + 1;

      if (!progress.enabled) {
        logger.verbose(`[${runOrdinal}/${plannedRuns}] case=${task.promptCase.id} repeat=${task.repeatIndex}`);
      }

      const runPaths = await prepareRunFilePaths(layout, task.caseDirectory, task.repeatIndex);

      const artifact = await executeRunTask({
        config,
        caseId: task.promptCase.id,
        caseDirectory: task.caseDirectory,
        prompt: task.promptCase.prompt,
        repeatIndex: task.repeatIndex,
        paths: runPaths,
      });

      // Trace analysis
      if (config.trace.enabled) {
        if (traceAnalysisStartupError || !traceStore || !pricingCatalog) {
          artifact.traceAnalysis = {
            status: "analysis_error",
            analyzedAtUtc: toUtcIso(),
            traceId: artifact.traceId,
            attempts: 0,
            spanCount: 0,
            totals: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              cachedInputTokens: 0,
              reasoningTokens: 0,
              costUsd: 0,
            },
            perModel: [],
            warnings: [],
            error: {
              kind: "db",
              message:
                traceAnalysisStartupError ??
                "Trace analysis runtime is unavailable.",
            },
          };
        } else {
          artifact.traceAnalysis = await analyzeTrace(artifact.traceId, {
            store: traceStore,
            pricingCatalog,
            timeoutMs: config.trace.pollTimeoutMs,
            pollMs: config.trace.pollIntervalMs,
          });
        }
      }

      await writeJson(runPaths.runJsonAbs, artifact);
      runArtifacts.push(artifact);
      durationValues.push(artifact.durationMs);
      completedRuns += 1;

      const caseSummary = perCase.get(task.promptCase.id);

      if (artifact.success) {
        successRuns += 1;
        if (caseSummary) caseSummary.successRuns += 1;
        if (!progress.enabled) {
          logger.verbose(
            `[ok] case=${task.promptCase.id} repeat=${task.repeatIndex} durationMs=${artifact.durationMs}`,
          );
        }
      } else {
        failedRuns += 1;
        if (caseSummary) caseSummary.failedRuns += 1;
        if (artifact.failureStage) {
          failureByStage[artifact.failureStage] += 1;
        }
        bufferedFailures.push({
          caseId: task.promptCase.id,
          repeatIndex: task.repeatIndex,
          runsPerPrompt: config.execution.repetitions,
          failureStage: artifact.failureStage,
          errorKind: artifact.error?.kind,
          errorMessage: artifact.error?.message,
        });
        if (!progress.enabled) {
          logger.verbose(
            `[failed] case=${task.promptCase.id} repeat=${task.repeatIndex} ${artifact.failureStage ?? ""}/${artifact.error?.kind ?? "unknown"} ${artifact.error?.message ?? ""}`,
          );
        }
      }

      progress.tick({ completedRuns, plannedRuns, successRuns, failedRuns });
    });
  } finally {
    progress.stop();
    if (closeTraceStore && traceStore?.close) {
      await traceStore.close();
    }
  }

  const completedAtUtc = toUtcIso();
  const summary: SummaryArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    experimentName: config.name,
    createdAtUtc: invocationAtUtc,
    completedAtUtc,
    plannedRuns,
    completedRuns,
    successRuns,
    failedRuns,
    failureByStage,
    durationMs: computeSummaryDurations(durationValues),
    perCase: promptCases.map((pc) => {
      const cs = perCase.get(pc.id);
      return {
        caseId: pc.id,
        caseDirectory: cs?.caseDirectory ?? pc.id,
        plannedRuns: cs?.plannedRuns ?? config.execution.repetitions,
        successRuns: cs?.successRuns ?? 0,
        failedRuns: cs?.failedRuns ?? 0,
      };
    }),
  };

  if (config.trace.enabled) {
    summary.traceAnalysis = buildTraceAnalysisSummary(runArtifacts);

    const traceCostReport = buildTraceCostReport({
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      experimentName: config.name,
      pricingCatalogVersion,
      runs: runArtifacts,
      createdAtUtc: completedAtUtc,
    });

    await writeJson(layout.traceCostReportPath, traceCostReport);
  }

  await writeJson(layout.summaryPath, summary);

  manifest.completedRuns = completedRuns;
  manifest.failedRuns = failedRuns;
  manifest.finishedAtUtc = completedAtUtc;
  await writeJson(layout.manifestPath, manifest);

  // Print final summary after progress bar is stopped
  logger.info(
    `Completed ${completedRuns}/${plannedRuns} runs (${successRuns} ok, ${failedRuns} failed)`,
  );
  printFailureSummary(bufferedFailures, logger);

  return {
    hadFailures: failedRuns > 0,
    outputRootAbs: layout.rootAbs,
    outputRootDisplay: layout.rootDisplay,
    manifestPath: layout.manifestPath,
    summaryPath: layout.summaryPath,
    traceCostReportPath: config.trace.enabled ? layout.traceCostReportPath : undefined,
    summary,
  };
}
