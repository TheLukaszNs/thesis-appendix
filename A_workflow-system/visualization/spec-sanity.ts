import type { QueryMetadata } from "@/mastra/contracts/workflow.contracts";
import { normalizeVisualizationSpec } from "./normalize-spec";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function collectEncodingFields(
  encoding: unknown,
  fields: Set<string>,
  issues: string[],
  metadataColumns: Set<string>,
) {
  const encodingObj = asObject(encoding);

  if (!encodingObj) {
    issues.push("Visualization is missing a valid 'encoding' object.");
    return;
  }

  for (const channelValue of Object.values(encodingObj)) {
    if (Array.isArray(channelValue)) {
      for (const entry of channelValue) {
        const field = asObject(entry)?.field;
        if (typeof field === "string") {
          fields.add(field);
          if (!metadataColumns.has(field)) {
            issues.push(`Encoding field '${field}' is missing in SQL output columns.`);
          }
        }
      }
      continue;
    }

    const field = asObject(channelValue)?.field;
    if (typeof field === "string") {
      fields.add(field);
      if (!metadataColumns.has(field)) {
        issues.push(`Encoding field '${field}' is missing in SQL output columns.`);
      }
    }
  }
}

export function runVegaSpecSanityCheck(params: {
  visualization: unknown;
  metadata: QueryMetadata;
}): {
  passed: boolean;
  issues: string[];
  fields: string[];
} {
  const issues: string[] = [];
  const fields = new Set<string>();
  const metadataColumns = new Set(params.metadata.columns);
  const visualization = normalizeVisualizationSpec(params.visualization);

  if (!visualization) {
    return {
      passed: false,
      issues: ["Visualization payload is not a valid JSON object."],
      fields: [],
    };
  }

  if (visualization["$schema"] !== "https://vega.github.io/schema/vega-lite/v5.json") {
    issues.push("Visualization must declare Vega-Lite v5 schema.");
  }

  const data = asObject(visualization.data);

  if (!data || data.name !== "query_result") {
    issues.push("Visualization must use data source { name: 'query_result' }.");
  }

  collectEncodingFields(visualization.encoding, fields, issues, metadataColumns);

  if (fields.size === 0) {
    issues.push("Visualization should reference at least one SQL output field.");
  }

  return {
    passed: issues.length === 0,
    issues,
    fields: Array.from(fields),
  };
}
