import path from "node:path";
import { readdir } from "node:fs/promises";

import type { PricingCatalog, RunArtifact } from "../types.ts";
import { isRecord, toUtcIso } from "../utils.ts";
import { writeJson } from "../artifacts/writer.ts";
import { analyzeTrace } from "../trace/analyzer.ts";
import { buildTraceAnalysisSummary, buildTraceCostReport } from "../trace/report.ts";
import { loadPricingCatalog } from "../config/pricing.ts";
import { BunSqlTraceSpanStore } from "../trace/store-bun-sql.ts";
import { ARTIFACT_SCHEMA_VERSION } from "../types.ts";

async function collectRunJsonFiles(runsRoot: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const resolved = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(resolved);
      } else if (entry.isFile() && entry.name === "run.json") {
        files.push(resolved);
      }
    }
  }

  await walk(runsRoot);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function shouldBackfill(run: RunArtifact): boolean {
  const analysis = run.traceAnalysis;
  if (!analysis) return true;
  return (
    analysis.status === "pending" ||
    analysis.status === "analysis_error" ||
    analysis.status === "pricing_missing"
  );
}

export async function backfillTraceAnalysis(params: {
  experimentDir: string;
  verbose: boolean;
  database?: string;
}): Promise<void> {
  const experimentDirAbs = path.resolve(process.cwd(), params.experimentDir);
  const runsRoot = path.join(experimentDirAbs, "runs");

  const runPaths = await collectRunJsonFiles(runsRoot);
  if (runPaths.length === 0) {
    console.log("No run.json files found.");
    return;
  }

  // Load runs
  const runs: Array<{ path: string; artifact: RunArtifact }> = [];
  for (const runPath of runPaths) {
    const content = await Bun.file(runPath).json();
    runs.push({ path: runPath, artifact: content as RunArtifact });
  }

  const toBackfill = runs.filter((r) => shouldBackfill(r.artifact));
  if (toBackfill.length === 0) {
    console.log("All runs already have complete trace analysis.");
    return;
  }

  console.log(`Backfilling ${toBackfill.length}/${runs.length} runs...`);

  // Read manifest for database URL
  const manifestPath = path.join(experimentDirAbs, "manifest.json");
  let database = params.database;
  if (!database) {
    try {
      const manifest = await Bun.file(manifestPath).json();
      if (isRecord(manifest) && typeof (manifest as any).traceDatabase === "string") {
        database = (manifest as any).traceDatabase;
      }
    } catch {
      // fall through
    }
  }
  if (!database) {
    database = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/mastra";
  }

  const pricingCatalog = loadPricingCatalog();
  const store = new BunSqlTraceSpanStore(database);

  try {
    for (let i = 0; i < toBackfill.length; i++) {
      const run = toBackfill[i]!;
      const label = `[${i + 1}/${toBackfill.length}] case=${run.artifact.caseId} repeat=${run.artifact.repeatIndex}`;

      if (params.verbose) {
        console.log(`${label} traceId=${run.artifact.traceId ?? "none"}`);
      }

      run.artifact.traceAnalysis = await analyzeTrace(run.artifact.traceId, {
        store,
        pricingCatalog,
        timeoutMs: 15000,
        pollMs: 1000,
      });

      await writeJson(run.path, run.artifact);

      if (params.verbose) {
        console.log(
          `${label} status=${run.artifact.traceAnalysis.status} tokens=${run.artifact.traceAnalysis.totals.totalTokens}`,
        );
      }
    }
  } finally {
    await store.close();
  }

  // Rebuild summary and trace cost report
  const allArtifacts = runs.map((r) => r.artifact);

  const summaryPath = path.join(experimentDirAbs, "summary.json");
  try {
    const existingSummary = (await Bun.file(summaryPath).json()) as any;
    existingSummary.traceAnalysis = buildTraceAnalysisSummary(allArtifacts);
    await writeJson(summaryPath, existingSummary);
  } catch {
    // If summary doesn't exist, skip
  }

  const traceCostReportPath = path.join(experimentDirAbs, "trace-cost-report.json");
  const traceCostReport = buildTraceCostReport({
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    experimentName: allArtifacts[0]?.experimentName ?? "unknown",
    pricingCatalogVersion: pricingCatalog.version,
    runs: allArtifacts,
  });
  await writeJson(traceCostReportPath, traceCostReport);

  console.log(
    `Backfill complete. Updated ${toBackfill.length} runs.`,
  );
}
