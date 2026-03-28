import path from "node:path";
import { parse as parseYaml } from "yaml";

import { ConfigError, UserInputError } from "../errors.ts";
import type { ExperimentConfig } from "../types.ts";
import { validateConfig } from "./schema.ts";

export async function loadConfig(
  configPathRaw: string,
  overrides?: {
    concurrency?: number;
    repetitions?: number;
  },
): Promise<ExperimentConfig> {
  const configPathAbs = path.resolve(process.cwd(), configPathRaw);
  const file = Bun.file(configPathAbs);

  if (!(await file.exists())) {
    throw new UserInputError(`Config file does not exist: ${configPathRaw}`);
  }

  const content = await file.text();

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Failed to parse YAML config: ${message}`);
  }

  const config = validateConfig(parsed);

  // Apply CLI overrides
  if (overrides?.concurrency !== undefined) {
    config.execution.concurrency = overrides.concurrency;
  }
  if (overrides?.repetitions !== undefined) {
    config.execution.repetitions = overrides.repetitions;
  }

  return config;
}
