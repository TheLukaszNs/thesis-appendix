import { UserInputError } from "../errors.ts";
import type { VegaSpec } from "../types.ts";
import { isRecord, structuredCloneSafe } from "../utils.ts";

function isPlaceholderName(value: unknown): boolean {
  return value === "query-data" || value === "query_result";
}

function isVegaLiteSpec(spec: VegaSpec): boolean {
  const schema = spec.$schema;
  if (typeof schema === "string" && schema.includes("/vega-lite/")) {
    return true;
  }
  return "encoding" in spec && !("marks" in spec);
}

export function normalizeVegaSpec(input: unknown): VegaSpec {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!isRecord(parsed)) {
        throw new UserInputError("Visualization JSON must be an object.");
      }
      return parsed;
    } catch (error) {
      if (error instanceof UserInputError) {
        throw error;
      }
      throw new UserInputError("Visualization is not valid JSON.");
    }
  }

  if (!isRecord(input)) {
    throw new UserInputError("Visualization must be a Vega spec object.");
  }

  return structuredCloneSafe(input);
}

function injectIntoDataObject(
  dataObject: Record<string, unknown>,
  queryData: unknown,
): Record<string, unknown> {
  const out = { ...dataObject };

  if (isPlaceholderName(out.values)) {
    out.values = structuredCloneSafe(queryData);
  }

  if (isPlaceholderName(out.name) && !("values" in out)) {
    out.values = structuredCloneSafe(queryData);
  }

  return out;
}

function injectQueryData(node: unknown, queryData: unknown, parentKey?: string): unknown {
  if (typeof node === "string") {
    if (parentKey === "values" && isPlaceholderName(node)) {
      return structuredCloneSafe(queryData);
    }
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => injectQueryData(item, queryData, parentKey));
  }

  if (isRecord(node)) {
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(node)) {
      out[key] = injectQueryData(value, queryData, key);
    }

    if (parentKey === "data") {
      return injectIntoDataObject(out, queryData);
    }

    return out;
  }

  return node;
}

export function resolveVegaSpecWithQueryData(
  rawSpec: VegaSpec,
  queryData: unknown,
): VegaSpec {
  const specWithData = injectQueryData(rawSpec, queryData) as VegaSpec;

  if (isVegaLiteSpec(rawSpec)) {
    // Inject into datasets for named data sources
    const dataNode = isRecord(specWithData.data) ? specWithData.data : undefined;
    if (dataNode) {
      const dataName = dataNode.name;
      if (typeof dataName === "string" && isPlaceholderName(dataName)) {
        const datasets = isRecord(specWithData.datasets)
          ? ({ ...specWithData.datasets } as Record<string, unknown>)
          : {};
        datasets[dataName] = structuredCloneSafe(queryData);
        specWithData.datasets = datasets;
      }
    }
  }

  return specWithData;
}
