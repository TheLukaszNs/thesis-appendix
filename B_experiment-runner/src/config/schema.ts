import type { ExperimentConfig, ThesisMetadata } from "../types.ts";
import { ConfigError } from "../errors.ts";
import { isRecord } from "../utils.ts";

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ConfigError(`'${field}' must be a non-empty string.`);
  }
  return value.trim();
}

function assertPositiveInt(value: unknown, field: string, defaultValue?: number): number {
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new ConfigError(`'${field}' must be a positive integer.`);
}

function assertBoolean(value: unknown, field: string, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw new ConfigError(`'${field}' must be a boolean.`);
}

function assertString(value: unknown, field: string, defaultValue: string): string {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === "string") {
    return value.trim();
  }
  throw new ConfigError(`'${field}' must be a string.`);
}

function parseThesisMetadata(raw: unknown): ThesisMetadata {
  if (!isRecord(raw)) {
    return { tags: [] };
  }

  return {
    condition: typeof raw.condition === "string" ? raw.condition : undefined,
    hypothesis: typeof raw.hypothesis === "string" ? raw.hypothesis : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === "string")
      : [],
  };
}

export function validateConfig(raw: unknown): ExperimentConfig {
  if (!isRecord(raw)) {
    throw new ConfigError("Config root must be an object.");
  }

  const name = assertNonEmptyString(raw.name, "name");
  const description = typeof raw.description === "string" ? raw.description : undefined;

  // API section
  const apiRaw = raw.api;
  if (!isRecord(apiRaw)) {
    throw new ConfigError("'api' section is required and must be an object.");
  }

  const baseUrl = assertNonEmptyString(apiRaw.baseUrl, "api.baseUrl");
  const workflowId = assertNonEmptyString(apiRaw.workflowId, "api.workflowId");
  const model = typeof apiRaw.model === "string" ? apiRaw.model.trim() : undefined;
  const timeoutMs = assertPositiveInt(apiRaw.timeoutMs, "api.timeoutMs", 120000);

  // Testset
  const testset = assertNonEmptyString(raw.testset, "testset");

  // Execution section
  const execRaw = isRecord(raw.execution) ? raw.execution : {};
  const repetitions = assertPositiveInt(execRaw.repetitions, "execution.repetitions", 1);
  const concurrency = assertPositiveInt(execRaw.concurrency, "execution.concurrency", 1);

  // Trace section
  const traceRaw = isRecord(raw.trace) ? raw.trace : {};
  const traceEnabled = assertBoolean(traceRaw.enabled, "trace.enabled", true);
  const traceDatabase = assertString(
    traceRaw.database,
    "trace.database",
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/mastra",
  );
  const pollTimeoutMs = assertPositiveInt(traceRaw.pollTimeoutMs, "trace.pollTimeoutMs", 15000);
  const pollIntervalMs = assertPositiveInt(traceRaw.pollIntervalMs, "trace.pollIntervalMs", 1000);

  // Output section
  const outputRaw = isRecord(raw.output) ? raw.output : {};
  const outputDir = assertString(outputRaw.dir, "output.dir", "experiments");

  // Metadata
  const metadata = parseThesisMetadata(raw.metadata);

  return {
    name,
    description,
    api: {
      baseUrl,
      workflowId,
      model,
      timeoutMs,
    },
    testset,
    execution: {
      repetitions,
      concurrency,
    },
    trace: {
      enabled: traceEnabled,
      database: traceDatabase,
      pollTimeoutMs,
      pollIntervalMs,
    },
    output: {
      dir: outputDir,
    },
    metadata,
  };
}
