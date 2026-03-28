import { SQL } from "bun";

import type { TraceSpanStore } from "./store.ts";
import type { TraceSpanRow } from "../types.ts";

export class BunSqlTraceSpanStore implements TraceSpanStore {
  private readonly sql: InstanceType<typeof SQL>;

  constructor(connectionString: string) {
    if (!connectionString || connectionString.trim().length === 0) {
      throw new Error(
        "Missing database connection string. Trace analysis requires PostgreSQL.",
      );
    }

    this.sql = new SQL(connectionString);
  }

  async listModelGenerationSpans(traceId: string): Promise<TraceSpanRow[]> {
    const rows = await this.sql`
      SELECT
        "traceId",
        "spanId",
        "spanType",
        "name",
        "attributes",
        "startedAt",
        "endedAt"
      FROM public.mastra_ai_spans
      WHERE "traceId" = ${traceId}
        AND LOWER("spanType") = 'model_generation'
        AND COALESCE("isEvent", false) = false
      ORDER BY "startedAt" ASC
    `;

    return (rows as any[]).map((row) => ({
      traceId: row.traceId,
      spanId: row.spanId,
      spanType: row.spanType,
      name: row.name,
      attributes: row.attributes,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
    }));
  }

  async close(): Promise<void> {
    await this.sql.close();
  }
}
