function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function normalizeVisualizationSpec(
  input: unknown,
): Record<string, unknown> | null {
  if (typeof input === "string") {
    const trimmed = input.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = tryParseJson(trimmed);
    if (!parsed) {
      return null;
    }

    return normalizeVisualizationSpec(parsed);
  }

  const record = asRecord(input);
  if (!record) {
    return null;
  }

  // Support common wrapper payloads that nest the actual Vega-Lite spec.
  const nested = record.vega_lite ?? record.visualization ?? record.spec;
  if (nested) {
    const normalizedNested = normalizeVisualizationSpec(nested);
    if (normalizedNested) {
      return normalizedNested;
    }
  }

  return record;
}
