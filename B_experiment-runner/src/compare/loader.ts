import path from "node:path";
import { readdir, stat } from "node:fs/promises";

import { UserInputError } from "../errors.ts";
import type { ManifestArtifact, RunArtifact, SummaryArtifact } from "../types.ts";
import type { GradesFile, GradeEntry, SqlChecksFile, GoldenSqlResultsFile } from "../grade/types.ts";

const LATEST_SELECTOR_TOKEN = "{latest}";

export interface SelectorResolution {
  input: string;
  resolvedSelector: string;
  invocationPathAbs: string;
}

export interface LoadedGradingData {
  grades: GradesFile | null;
  sqlChecks: SqlChecksFile | null;
  goldenSqlResults: GoldenSqlResultsFile | null;
}

export interface LoadedInvocation {
  selectorInput: string;
  selectorResolved: string;
  invocationPathAbs: string;
  experimentName: string;
  invocationDir: string;
  manifest: ManifestArtifact;
  summary: SummaryArtifact;
  runs: RunArtifact[];
  runsPerPrompt: number;
  caseIds: string[];
  grading: LoadedGradingData;
}

export interface IncompleteInvocation {
  reason: string;
  details?: string;
}

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stats = await stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return (await Bun.file(filePath).json()) as T;
}

async function tryReadJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return null;
    return (await file.json()) as T;
  } catch {
    return null;
  }
}

async function collectRunJsonFiles(runsRoot: string): Promise<string[]> {
  if (!(await directoryExists(runsRoot))) {
    return [];
  }

  const files: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });
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

async function listInvocationDirectories(experimentRoot: string): Promise<string[]> {
  if (!(await directoryExists(experimentRoot))) {
    return [];
  }

  const entries = await readdir(experimentRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function parseStructuredSelector(selector: string):
  | { experimentName: string; invocationDir: string }
  | { experimentName: string; latest: true }
  | null {
  const trimmed = selector.trim();
  const parts = trimmed.split("/").filter((part) => part.length > 0);

  if (parts.length !== 2) return null;

  const experimentName = parts[0] ?? "";
  const second = parts[1] ?? "";

  if (experimentName.length === 0 || second.length === 0) return null;

  if (second === LATEST_SELECTOR_TOKEN) {
    return { experimentName, latest: true };
  }

  return { experimentName, invocationDir: second };
}

export async function resolveSelector(
  selectorRaw: string,
  resultsRootAbs: string,
): Promise<SelectorResolution> {
  const selector = selectorRaw.trim();
  if (selector.length === 0) {
    throw new UserInputError("--target cannot be empty.");
  }

  // Try as direct path
  const directPath = path.resolve(process.cwd(), selector);
  if (await directoryExists(directPath)) {
    const invocationDir = path.basename(directPath);
    const experimentName = path.basename(path.dirname(directPath));
    return {
      input: selectorRaw,
      resolvedSelector: `${experimentName}/${invocationDir}`,
      invocationPathAbs: directPath,
    };
  }

  // Try as structured selector
  const structured = parseStructuredSelector(selector);
  if (!structured) {
    throw new UserInputError(
      `Invalid target selector '${selectorRaw}'. Expected <experiment-name>/{latest}, <experiment-name>/<invocation-dir>, or directory path.`,
    );
  }

  const experimentRoot = path.join(resultsRootAbs, structured.experimentName);
  if (!(await directoryExists(experimentRoot))) {
    throw new UserInputError(
      `Experiment directory does not exist for selector '${selectorRaw}': ${experimentRoot}`,
    );
  }

  if ("latest" in structured) {
    const invocationDirs = await listInvocationDirectories(experimentRoot);
    const latest = invocationDirs[invocationDirs.length - 1];

    if (!latest) {
      throw new UserInputError(
        `No invocations found for selector '${selectorRaw}' in ${experimentRoot}.`,
      );
    }

    return {
      input: selectorRaw,
      resolvedSelector: `${structured.experimentName}/${latest}`,
      invocationPathAbs: path.join(experimentRoot, latest),
    };
  }

  const invocationPathAbs = path.join(experimentRoot, structured.invocationDir);
  if (!(await directoryExists(invocationPathAbs))) {
    throw new UserInputError(
      `Invocation directory does not exist for selector '${selectorRaw}': ${invocationPathAbs}`,
    );
  }

  return {
    input: selectorRaw,
    resolvedSelector: `${structured.experimentName}/${structured.invocationDir}`,
    invocationPathAbs,
  };
}

export async function tryLoadInvocation(
  resolution: SelectorResolution,
): Promise<{ loaded?: LoadedInvocation; incomplete?: IncompleteInvocation }> {
  const manifestPath = path.join(resolution.invocationPathAbs, "manifest.json");
  const summaryPath = path.join(resolution.invocationPathAbs, "summary.json");

  const manifestExists = await Bun.file(manifestPath).exists();
  if (!manifestExists) {
    return { incomplete: { reason: "missing_manifest" } };
  }

  const summaryExists = await Bun.file(summaryPath).exists();
  if (!summaryExists) {
    return { incomplete: { reason: "missing_summary" } };
  }

  let manifest: ManifestArtifact;
  let summary: SummaryArtifact;

  try {
    manifest = await readJsonFile<ManifestArtifact>(manifestPath);
  } catch {
    return { incomplete: { reason: "invalid_manifest_json" } };
  }

  try {
    summary = await readJsonFile<SummaryArtifact>(summaryPath);
  } catch {
    return { incomplete: { reason: "invalid_summary_json" } };
  }

  const runPaths = await collectRunJsonFiles(path.join(resolution.invocationPathAbs, "runs"));
  if (runPaths.length === 0) {
    return { incomplete: { reason: "missing_run_artifacts" } };
  }

  const runs: RunArtifact[] = [];
  for (const runPath of runPaths) {
    try {
      const run = await readJsonFile<RunArtifact>(runPath);
      runs.push(run);
    } catch {
      return { incomplete: { reason: "invalid_run_json", details: runPath } };
    }
  }

  if (!Number.isInteger(manifest.runsPerPrompt) || manifest.runsPerPrompt <= 0) {
    return { incomplete: { reason: "invalid_runs_per_prompt" } };
  }

  const caseIds = manifest.cases.map((item) => item.id);
  if (caseIds.length === 0) {
    return { incomplete: { reason: "no_cases" } };
  }

  runs.sort((a, b) => {
    const caseCmp = a.caseId.localeCompare(b.caseId);
    if (caseCmp !== 0) return caseCmp;
    return a.repeatIndex - b.repeatIndex;
  });

  const experimentName = manifest.experimentName;
  const invocationDir = path.basename(resolution.invocationPathAbs);

  // Load grading artifacts in parallel
  const [grades, sqlChecks, goldenSqlResults] = await Promise.all([
    tryReadJsonFile<GradesFile>(path.join(resolution.invocationPathAbs, "grades.json")),
    tryReadJsonFile<SqlChecksFile>(path.join(resolution.invocationPathAbs, "sql-checks.json")),
    tryReadJsonFile<GoldenSqlResultsFile>(path.join(resolution.invocationPathAbs, "golden-sql-results.json")),
  ]);

  // Backfill v1 grades (missing issues field)
  if (grades?.entries) {
    for (const entry of grades.entries) {
      if (!("issues" in entry) || !Array.isArray((entry as GradeEntry).issues)) {
        (entry as GradeEntry).issues = [];
      }
    }
  }

  return {
    loaded: {
      selectorInput: resolution.input,
      selectorResolved: resolution.resolvedSelector,
      invocationPathAbs: resolution.invocationPathAbs,
      experimentName,
      invocationDir,
      manifest,
      summary,
      runs,
      runsPerPrompt: manifest.runsPerPrompt,
      caseIds,
      grading: { grades, sqlChecks, goldenSqlResults },
    },
  };
}
