import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { OutputLayout } from "./layout.ts";

export interface RunFilePaths {
  runDirAbs: string;
  runDirRel: string;
  runJsonAbs: string;
  runJsonRel: string;
  querySqlAbs: string;
  querySqlRel: string;
  vegaRawAbs: string;
  vegaRawRel: string;
  vegaResolvedAbs: string;
  vegaResolvedRel: string;
  imageAbs: string;
  imageRel: string;
}

export async function prepareRunFilePaths(
  layout: OutputLayout,
  caseDirectory: string,
  repeatIndex: number,
): Promise<RunFilePaths> {
  const runFolder = `run-${String(repeatIndex).padStart(4, "0")}`;
  const runDirRel = path.posix.join("runs", caseDirectory, runFolder);
  const runDirAbs = path.join(layout.rootAbs, "runs", caseDirectory, runFolder);

  await mkdir(runDirAbs, { recursive: true });

  return {
    runDirAbs,
    runDirRel,
    runJsonAbs: path.join(runDirAbs, "run.json"),
    runJsonRel: path.posix.join(runDirRel, "run.json"),
    querySqlAbs: path.join(runDirAbs, "query.sql"),
    querySqlRel: path.posix.join(runDirRel, "query.sql"),
    vegaRawAbs: path.join(runDirAbs, "vega.raw.json"),
    vegaRawRel: path.posix.join(runDirRel, "vega.raw.json"),
    vegaResolvedAbs: path.join(runDirAbs, "vega.resolved.json"),
    vegaResolvedRel: path.posix.join(runDirRel, "vega.resolved.json"),
    imageAbs: path.join(runDirAbs, "viz.png"),
    imageRel: path.posix.join(runDirRel, "viz.png"),
  };
}
