import type {
  Attempts,
  FailureStage,
  QueryMetadata,
  ResultShape,
  ValidationResult,
} from "../types.ts";
import { isRecord } from "../utils.ts";

function toInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return undefined;
}

function toPositiveInteger(value: unknown): number | undefined {
  const integer = toInteger(value);
  if (integer === undefined || integer < 1) {
    return undefined;
  }
  return integer;
}

function toNonNegativeInteger(value: unknown): number | undefined {
  const integer = toInteger(value);
  if (integer === undefined || integer < 0) {
    return undefined;
  }
  return integer;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toResultRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> => isRecord(item));
}

function deriveMetadataFromData(data: unknown): QueryMetadata | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  const rows = toResultRows(data);
  const sample = rows.slice(0, 5);
  const columns: string[] = [];
  const seenColumns = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seenColumns.has(key)) {
        seenColumns.add(key);
        columns.push(key);
      }
    }
  }

  return {
    columns,
    rowCount: data.length,
    sample,
  };
}

function normalizeQueryMetadata(value: unknown, data: unknown): QueryMetadata | undefined {
  const derived = deriveMetadataFromData(data);
  if (!isRecord(value)) {
    return derived;
  }

  const columns = toStringArray(value.columns);
  const rowCount = toNonNegativeInteger(value.rowCount);
  const sample =
    Array.isArray(value.sample) && value.sample.length > 0 ? toResultRows(value.sample) : undefined;
  const hasExplicitSample = Array.isArray(value.sample);
  const hasAnyField = columns.length > 0 || rowCount !== undefined || hasExplicitSample;

  if (!hasAnyField) {
    return derived;
  }

  return {
    columns: columns.length > 0 ? columns : (derived?.columns ?? []),
    rowCount: rowCount ?? derived?.rowCount ?? 0,
    sample: sample ?? (hasExplicitSample ? [] : (derived?.sample ?? [])),
  };
}

function normalizeValidationResult(value: unknown): ValidationResult | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const workflowRaw = value.workflow;
  const workflow =
    typeof workflowRaw === "string" && workflowRaw.trim().length > 0
      ? workflowRaw.trim()
      : "unknown";

  const passed =
    typeof value.passed === "boolean"
      ? value.passed
      : typeof value.isValid === "boolean"
        ? value.isValid
        : undefined;

  const scoreRaw = value.score;
  const score =
    typeof scoreRaw === "number" && Number.isFinite(scoreRaw)
      ? Math.max(0, Math.min(1, scoreRaw))
      : undefined;

  const issues = toStringArray(value.issues);
  const repairPromptRaw = value.repairPrompt;
  const repairPrompt =
    typeof repairPromptRaw === "string" && repairPromptRaw.trim().length > 0
      ? repairPromptRaw
      : undefined;

  if (passed === undefined && score === undefined && issues.length === 0 && !repairPrompt) {
    return undefined;
  }

  return {
    workflow,
    passed: passed ?? (score !== undefined ? score >= 0.5 : issues.length === 0),
    score: score ?? (passed ? 1 : 0),
    issues,
    repairPrompt,
  };
}

function normalizeAttempts(value: unknown): Attempts | undefined {
  const numericAttempts = toPositiveInteger(value);
  if (numericAttempts !== undefined) {
    return { used: numericAttempts, max: numericAttempts, history: [] };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const usedRaw = toPositiveInteger(value.used);
  const maxRaw = toPositiveInteger(value.max);
  const history = toStringArray(value.history);

  if (usedRaw === undefined && maxRaw === undefined && history.length === 0) {
    return undefined;
  }

  const used = usedRaw ?? 1;
  const max = Math.max(maxRaw ?? used, used);

  return { used, max, history };
}

function normalizeLegacyAttempts(source: Record<string, unknown> | undefined): Attempts | undefined {
  if (!source) {
    return undefined;
  }

  const usedRaw = toPositiveInteger(source.attempt);
  const maxRaw = toPositiveInteger(source.maxAttempts);
  const historySummary =
    typeof source.historySummary === "string" && source.historySummary.trim().length > 0
      ? [source.historySummary.trim()]
      : [];

  if (usedRaw === undefined && maxRaw === undefined && historySummary.length === 0) {
    return undefined;
  }

  const used = usedRaw ?? 1;
  const max = Math.max(maxRaw ?? used, used);

  return { used, max, history: historySummary };
}

export function getTraceId(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }
  const traceId = payload.traceId;
  if (typeof traceId === "string" && traceId.trim().length > 0) {
    return traceId;
  }
  return undefined;
}

export function parseResultShape(payload: unknown):
  | { ok: true; value: ResultShape }
  | { ok: false; stage: FailureStage; message: string } {
  if (!isRecord(payload)) {
    return {
      ok: false,
      stage: "e2e",
      message: "Endpoint response must be a JSON object at root.",
    };
  }

  const resultNode = isRecord(payload.result) ? payload.result : undefined;
  const resultsNode = isRecord(payload.results) ? payload.results : undefined;
  const resultFinalDataNode = resultNode && isRecord(resultNode.finalData) ? resultNode.finalData : undefined;
  const payloadFinalDataNode = isRecord(payload.finalData) ? payload.finalData : undefined;
  const source = resultFinalDataNode ?? payloadFinalDataNode ?? resultNode ?? payload;

  const latestNode =
    (resultNode && isRecord(resultNode.latest) ? resultNode.latest : undefined) ??
    (isRecord(source.latest) ? source.latest : undefined);
  const latestExecution = latestNode && isRecord(latestNode.execution) ? latestNode.execution : undefined;
  const latestSqlDraft = latestNode && isRecord(latestNode.sqlDraft) ? latestNode.sqlDraft : undefined;
  const latestVisualization =
    latestNode && isRecord(latestNode.visualization) ? latestNode.visualization : undefined;
  const latestValidation = latestNode && isRecord(latestNode.validation) ? latestNode.validation : undefined;

  const data = source.data ?? latestExecution?.data;
  const sqlCandidate = source.sql ?? latestExecution?.sql ?? latestSqlDraft?.sql;
  const sql = typeof sqlCandidate === "string" ? sqlCandidate : undefined;
  const visualization =
    source.visualization ??
    resultsNode?.visualization ??
    latestVisualization?.visualization ??
    latestVisualization;
  const metadata = normalizeQueryMetadata(source.metadata ?? latestExecution?.metadata, data);
  const quality = normalizeValidationResult(source.quality ?? latestValidation ?? source.validation);
  const attempts =
    normalizeAttempts(source.attempts) ??
    normalizeLegacyAttempts(resultNode) ??
    normalizeLegacyAttempts(source as Record<string, unknown>);

  if (data === undefined || data === null) {
    return {
      ok: false,
      stage: "sql",
      message:
        "Missing or invalid 'data' in endpoint response (expected result.finalData.data, result.data, or data).",
    };
  }

  if (!sql || sql.trim().length === 0) {
    return {
      ok: false,
      stage: "sql",
      message:
        "Missing or invalid 'sql' in endpoint response (expected result.finalData.sql, result.sql, or sql).",
    };
  }

  if (visualization === undefined) {
    return {
      ok: false,
      stage: "viz",
      message:
        "Missing 'visualization' in endpoint response (expected result.finalData.visualization, result.visualization, results.visualization, or visualization).",
    };
  }

  return {
    ok: true,
    value: { data, visualization, sql, metadata, quality, attempts },
  };
}
