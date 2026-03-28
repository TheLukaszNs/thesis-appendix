import type { EndpointInvocationResult } from "../types.ts";
import { toUtcIso } from "../utils.ts";

function headersToObject(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

export async function invokeEndpoint(params: {
  url: string;
  body: unknown;
  timeoutMs: number;
}): Promise<EndpointInvocationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  const started = new Date();

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params.body),
      signal: controller.signal,
    });

    const bodyRaw = await response.text();
    const ended = new Date();

    return {
      startedAtUtc: toUtcIso(started),
      endedAtUtc: toUtcIso(ended),
      durationMs: ended.getTime() - started.getTime(),
      status: response.status,
      headers: headersToObject(response.headers),
      bodyRaw,
      timedOut: false,
    };
  } catch (error) {
    const ended = new Date();
    const timedOut = error instanceof DOMException && error.name === "AbortError";

    return {
      startedAtUtc: toUtcIso(started),
      endedAtUtc: toUtcIso(ended),
      durationMs: ended.getTime() - started.getTime(),
      headers: {},
      transportError: error instanceof Error ? error.message : String(error),
      timedOut,
    };
  } finally {
    clearTimeout(timeout);
  }
}
