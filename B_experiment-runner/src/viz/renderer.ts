import type { VegaSpec } from "../types.ts";
import { writeJson } from "../artifacts/writer.ts";

export async function renderVegaSpecToPng(
  spec: VegaSpec,
  specPath: string,
  pngPath: string,
): Promise<void> {
  await writeJson(specPath, spec);
  await Bun.$`bunx vl2png ${specPath} ${pngPath}`.quiet();
}
