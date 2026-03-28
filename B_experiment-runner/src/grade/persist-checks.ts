import path from "node:path";

import { writeJson } from "../artifacts/writer.ts";
import { toUtcIso } from "../utils.ts";
import type { GradableRun, SqlChecksFile, GoldenSqlResultsFile } from "./types.ts";

function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
  }
}

export async function persistSqlChecks(
  invocationPathAbs: string,
  experimentName: string,
  invocationDir: string,
  databaseUrl: string,
  runs: GradableRun[],
): Promise<string> {
  const entries = runs
    .filter((r) => r.sqlCheck !== null)
    .map((r) => ({ caseId: r.caseId, repeatIndex: r.repeatIndex, result: r.sqlCheck! }));

  const file: SqlChecksFile = {
    schemaVersion: "agent-runner/sql-checks/v1",
    experimentName,
    invocationDir,
    createdAtUtc: toUtcIso(),
    databaseUrl: sanitizeDatabaseUrl(databaseUrl),
    entries,
  };

  const filePath = path.join(invocationPathAbs, "sql-checks.json");
  await writeJson(filePath, file);
  return filePath;
}

export async function persistGoldenSqlResults(
  invocationPathAbs: string,
  experimentName: string,
  invocationDir: string,
  databaseUrl: string,
  runs: GradableRun[],
): Promise<string> {
  const entries = runs
    .filter((r) => r.goldenSqlComparison !== null)
    .map((r) => ({ caseId: r.caseId, repeatIndex: r.repeatIndex, result: r.goldenSqlComparison! }));

  const file: GoldenSqlResultsFile = {
    schemaVersion: "agent-runner/golden-sql-results/v1",
    experimentName,
    invocationDir,
    createdAtUtc: toUtcIso(),
    databaseUrl: sanitizeDatabaseUrl(databaseUrl),
    entries,
  };

  const filePath = path.join(invocationPathAbs, "golden-sql-results.json");
  await writeJson(filePath, file);
  return filePath;
}
