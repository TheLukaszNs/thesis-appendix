import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { ExperimentConfig } from "../types.ts";
import { toDisplayPath, toInvocationDirName, toUtcIso } from "../utils.ts";

export interface OutputLayout {
  rootAbs: string;
  rootDisplay: string;
  runsRootAbs: string;
  manifestPath: string;
  summaryPath: string;
  traceCostReportPath: string;
  configCopyPath: string;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    const file = Bun.file(targetPath);
    return await file.exists();
  } catch {
    return false;
  }
}

export async function prepareOutputLayout(
  config: ExperimentConfig,
  invocationAtUtc: string,
): Promise<OutputLayout> {
  const outDirAbs = path.resolve(process.cwd(), config.output.dir);
  const experimentRoot = path.join(outDirAbs, config.name);
  await mkdir(experimentRoot, { recursive: true });

  const invocationDirName = toInvocationDirName(invocationAtUtc);
  let candidate = path.join(experimentRoot, invocationDirName);
  let suffix = 1;

  while (await pathExists(candidate)) {
    const padded = String(suffix).padStart(2, "0");
    candidate = path.join(experimentRoot, `${invocationDirName}-${padded}`);
    suffix += 1;
  }

  await mkdir(candidate, { recursive: true });
  const runsRootAbs = path.join(candidate, "runs");
  await mkdir(runsRootAbs, { recursive: true });

  return {
    rootAbs: candidate,
    rootDisplay: toDisplayPath(candidate),
    runsRootAbs,
    manifestPath: path.join(candidate, "manifest.json"),
    summaryPath: path.join(candidate, "summary.json"),
    traceCostReportPath: path.join(candidate, "trace-cost-report.json"),
    configCopyPath: path.join(candidate, "config.yaml"),
  };
}
