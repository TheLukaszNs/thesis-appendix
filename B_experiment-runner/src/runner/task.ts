import type {
  ExperimentConfig,
  FailureStage,
  RunArtifact,
  RunError,
} from "../types.ts";
import { ARTIFACT_SCHEMA_VERSION } from "../types.ts";
import { structuredCloneSafe, toUtcIso } from "../utils.ts";
import { invokeEndpoint } from "./endpoint.ts";
import { getTraceId, parseResultShape } from "./response.ts";
import { normalizeVegaSpec, resolveVegaSpecWithQueryData } from "../viz/normalize.ts";
import { renderVegaSpecToPng } from "../viz/renderer.ts";
import { writeJson, writeText } from "../artifacts/writer.ts";
import type { RunFilePaths } from "../artifacts/paths.ts";

export interface RunTaskArgs {
  config: ExperimentConfig;
  caseId: string;
  caseDirectory: string;
  prompt: string;
  repeatIndex: number;
  paths: RunFilePaths;
}

function toRunError(params: {
  kind: RunError["kind"];
  message: string;
  statusCode?: number;
  timedOut?: boolean;
}): RunError {
  return {
    kind: params.kind,
    message: params.message,
    statusCode: params.statusCode,
    timedOut: params.timedOut,
  };
}

export async function executeRunTask(args: RunTaskArgs): Promise<RunArtifact> {
  const runStarted = new Date();
  const { config, paths } = args;
  const url = `${config.api.baseUrl}/api/workflows/${config.api.workflowId}/start-async`;

  const requestBody: Record<string, unknown> = {
    inputData: { question: args.prompt },
  };
  if (config.api.model) {
    requestBody.requestContext = { model: config.api.model };
  }

  const finalize = (
    baseArtifact: Omit<RunArtifact, "createdAtUtc" | "success" | "durationMs">,
    params: {
      success: boolean;
      traceId?: string;
      resultRaw?: unknown;
      result?: unknown;
      failureStage?: FailureStage;
      error?: RunError;
    },
  ): RunArtifact => {
    const runEnded = new Date();
    return {
      ...baseArtifact,
      createdAtUtc: toUtcIso(runEnded),
      traceId: params.traceId,
      success: params.success,
      durationMs: runEnded.getTime() - runStarted.getTime(),
      resultRaw: params.resultRaw,
      result: params.result,
      failureStage: params.failureStage,
      error: params.error,
    };
  };

  const endpoint = await invokeEndpoint({
    url,
    body: requestBody,
    timeoutMs: config.api.timeoutMs,
  });

  const response = {
    status: endpoint.status,
    headers: endpoint.headers,
    bodyRaw: endpoint.bodyRaw,
  };

  const request = {
    url,
    method: "POST" as const,
    timeoutMs: config.api.timeoutMs,
    body: requestBody,
    startedAtUtc: endpoint.startedAtUtc,
    endedAtUtc: endpoint.endedAtUtc,
    durationMs: endpoint.durationMs,
  };

  const baseArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    experimentName: config.name,
    caseId: args.caseId,
    caseDirectory: args.caseDirectory,
    repeatIndex: args.repeatIndex,
    prompt: args.prompt,
    request,
    response,
    artifacts: {
      runPath: paths.runJsonRel,
      queryPath: paths.querySqlRel,
      vegaRawPath: paths.vegaRawRel,
      vegaResolvedPath: paths.vegaResolvedRel,
      imagePath: paths.imageRel,
    },
  } satisfies Omit<RunArtifact, "createdAtUtc" | "success" | "durationMs">;

  // Transport errors
  if (endpoint.transportError) {
    return finalize(baseArtifact, {
      success: false,
      failureStage: "e2e",
      error: toRunError({
        kind: endpoint.timedOut ? "timeout" : "network",
        message: endpoint.transportError,
        timedOut: endpoint.timedOut,
      }),
    });
  }

  if (typeof endpoint.status !== "number") {
    return finalize(baseArtifact, {
      success: false,
      failureStage: "e2e",
      error: toRunError({ kind: "network", message: "No HTTP status code." }),
    });
  }

  if (endpoint.status < 200 || endpoint.status >= 300) {
    return finalize(baseArtifact, {
      success: false,
      failureStage: "e2e",
      error: toRunError({
        kind: "http_status",
        message: `Endpoint returned HTTP ${endpoint.status}.`,
        statusCode: endpoint.status,
      }),
    });
  }

  if (!endpoint.bodyRaw) {
    return finalize(baseArtifact, {
      success: false,
      failureStage: "e2e",
      error: toRunError({ kind: "invalid_json", message: "Empty response body." }),
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(endpoint.bodyRaw);
  } catch {
    return finalize(baseArtifact, {
      success: false,
      failureStage: "e2e",
      error: toRunError({ kind: "invalid_json", message: "Response body is not valid JSON." }),
    });
  }

  const traceId = getTraceId(parsedBody);
  const parsed = parseResultShape(parsedBody);

  if (!parsed.ok) {
    return finalize(baseArtifact, {
      success: false,
      traceId,
      failureStage: parsed.stage,
      resultRaw: parsedBody,
      error: toRunError({ kind: "invalid_shape", message: parsed.message }),
    });
  }

  const resultRaw = structuredCloneSafe(parsed.value);

  try {
    // Write SQL file
    await writeText(paths.querySqlAbs, parsed.value.sql);

    // Write raw and resolved Vega specs, then render
    const rawSpec = normalizeVegaSpec(parsed.value.visualization);
    const resolvedSpec = resolveVegaSpecWithQueryData(rawSpec, parsed.value.data);
    await renderVegaSpecToPng(resolvedSpec, paths.vegaResolvedAbs, paths.imageAbs);
    await writeJson(paths.vegaRawAbs, rawSpec);

    return finalize(baseArtifact, {
      success: true,
      traceId,
      resultRaw,
      result: parsed.value,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return finalize(baseArtifact, {
      success: false,
      traceId,
      failureStage: "viz",
      resultRaw,
      error: toRunError({ kind: "viz_failure", message }),
    });
  }
}
