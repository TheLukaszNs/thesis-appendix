import path from "node:path";

import { UserInputError } from "../errors.ts";
import { isRecord } from "../utils.ts";
import { resolveSelector, tryLoadInvocation } from "../compare/loader.ts";
import { loadGrades, gradesFilePath } from "./store.ts";
import { loadTestset } from "../testset/loader.ts";
import type { RunArtifact } from "../types.ts";
import type { GradableRun, GradableRunsResult } from "./types.ts";

function extractRowCount(run: RunArtifact): number | null {
  const result = run.result;
  if (!isRecord(result)) return null;
  const metadata = (result as Record<string, unknown>).metadata;
  if (!isRecord(metadata)) return null;
  const rowCount = (metadata as Record<string, unknown>).rowCount;
  if (typeof rowCount === "number") return rowCount;
  return null;
}

export async function loadGradableRuns(
  selector: string,
  outputDir: string = "experiments",
): Promise<GradableRunsResult> {
  const resultsRootAbs = path.resolve(process.cwd(), outputDir);
  const resolution = await resolveSelector(selector, resultsRootAbs);
  const result = await tryLoadInvocation(resolution);

  if (result.incomplete) {
    throw new UserInputError(
      `Cannot load invocation for '${selector}': ${result.incomplete.reason}${result.incomplete.details ? ` (${result.incomplete.details})` : ""}`,
    );
  }

  const inv = result.loaded!;
  const grades = await loadGrades(inv.invocationPathAbs);

  // Load golden SQL from testset via manifest
  const goldenSqlByCaseId = new Map<string, string>();
  const testsetPath = inv.manifest.testsetPath;
  if (testsetPath) {
    try {
      const cases = await loadTestset(testsetPath);
      for (const c of cases) {
        if (c.golden_sql) {
          goldenSqlByCaseId.set(c.id, c.golden_sql);
        }
      }
    } catch {
      // Testset file may not be found (moved, deleted) — graceful fallback
      console.warn(`Warning: Could not load testset from '${testsetPath}' for golden SQL lookup`);
    }
  }

  const runs: GradableRun[] = inv.runs.map((run) => {
    const imagePath = run.artifacts.imagePath
      ? path.resolve(inv.invocationPathAbs, run.artifacts.imagePath)
      : null;
    const sqlPath = run.artifacts.queryPath
      ? path.resolve(inv.invocationPathAbs, run.artifacts.queryPath)
      : null;
    const runJsonPath = run.artifacts.runPath
      ? path.resolve(inv.invocationPathAbs, run.artifacts.runPath)
      : null;

    const existingGrade =
      grades?.entries.find(
        (e) => e.caseId === run.caseId && e.repeatIndex === run.repeatIndex,
      ) ?? null;

    return {
      caseId: run.caseId,
      repeatIndex: run.repeatIndex,
      prompt: run.prompt,
      success: run.success,
      durationMs: run.durationMs,
      imagePath,
      sqlPath,
      runJsonPath,
      rowCount: extractRowCount(run),
      sqlCheck: null,
      goldenSqlComparison: null,
      existingGrade,
    };
  });

  return {
    experimentName: inv.experimentName,
    invocationDir: inv.invocationDir,
    invocationPathAbs: inv.invocationPathAbs,
    runs,
    goldenSqlByCaseId,
    gradesFilePath: gradesFilePath(inv.invocationPathAbs),
  };
}
