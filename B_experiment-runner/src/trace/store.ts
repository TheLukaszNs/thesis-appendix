import type { TraceSpanRow } from "../types.ts";

export interface TraceSpanStore {
  listModelGenerationSpans(traceId: string): Promise<TraceSpanRow[]>;
  close?(): Promise<void>;
}
