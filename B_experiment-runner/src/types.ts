export const ARTIFACT_SCHEMA_VERSION = "agent-runner/v2" as const;

export type FailureStage = "sql" | "viz" | "e2e";

export interface ThesisMetadata {
  condition?: string;
  hypothesis?: string;
  notes?: string;
  tags: string[];
}

export interface PromptCase {
  id: string;
  prompt: string;
  golden_sql?: string;
  metadata?: Record<string, unknown>;
  request?: unknown;
  sourceLine?: number;
}

export type ResultRow = Record<string, unknown>;

export interface QueryMetadata {
  columns: string[];
  rowCount: number;
  sample: ResultRow[];
}

export interface SqlExecution {
  ok: boolean;
  sql: string;
  metadata: QueryMetadata;
  data: ResultRow[];
  error?: SqlExecutionError;
}

export interface SqlExecutionError {
  type: "validation" | "execution" | "limit";
  message: string;
  details?: string;
}

export interface ValidationResult {
  workflow: string;
  passed: boolean;
  score: number;
  issues: string[];
  repairPrompt?: string;
}

export interface Attempts {
  used: number;
  max: number;
  history: string[];
}

export interface ResultShape {
  data: unknown;
  visualization: unknown;
  sql: string;
  metadata?: QueryMetadata;
  quality?: ValidationResult;
  attempts?: Attempts;
}

export interface RunError {
  kind:
    | "network"
    | "timeout"
    | "http_status"
    | "invalid_json"
    | "invalid_shape"
    | "request_build"
    | "viz_failure";
  message: string;
  statusCode?: number;
  timedOut?: boolean;
}

export interface RunRequestMetadata {
  url: string;
  method: "POST";
  timeoutMs: number;
  body?: unknown;
  startedAtUtc: string;
  endedAtUtc: string;
  durationMs: number;
}

export interface RunResponseMetadata {
  status?: number;
  headers?: Record<string, string>;
  bodyRaw?: string;
}

export interface EndpointInvocationResult {
  startedAtUtc: string;
  endedAtUtc: string;
  durationMs: number;
  status?: number;
  headers: Record<string, string>;
  bodyRaw?: string;
  transportError?: string;
  timedOut: boolean;
}

export interface RunArtifact {
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  experimentName: string;
  caseId: string;
  caseDirectory: string;
  repeatIndex: number;
  prompt: string;
  createdAtUtc: string;
  traceId?: string;
  success: boolean;
  durationMs: number;
  request: RunRequestMetadata;
  response: RunResponseMetadata;
  resultRaw?: unknown;
  result?: unknown;
  traceAnalysis?: TraceAnalysisResult;
  failureStage?: FailureStage;
  error?: RunError;
  artifacts: {
    runPath: string;
    queryPath?: string;
    vegaRawPath?: string;
    vegaResolvedPath?: string;
    imagePath?: string;
  };
}

export interface ManifestArtifact {
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  experimentName: string;
  createdAtUtc: string;
  finishedAtUtc?: string;
  workflowId: string;
  baseUrl: string;
  timeoutMs: number;
  runsPerPrompt: number;
  concurrency: number;
  outputRoot: string;
  testsetPath: string;
  thesis: ThesisMetadata;
  plannedRuns: number;
  completedRuns: number;
  failedRuns: number;
  cases: Array<{
    id: string;
    caseDirectory: string;
  }>;
}

export interface SummaryArtifact {
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  experimentName: string;
  createdAtUtc: string;
  completedAtUtc: string;
  plannedRuns: number;
  completedRuns: number;
  successRuns: number;
  failedRuns: number;
  failureByStage: Record<FailureStage, number>;
  durationMs: {
    minMs: number;
    maxMs: number;
    meanMs: number;
    p50Ms: number;
    p95Ms: number;
  };
  perCase: Array<{
    caseId: string;
    caseDirectory: string;
    plannedRuns: number;
    successRuns: number;
    failedRuns: number;
  }>;
  traceAnalysis?: TraceAnalysisSummary;
}

export interface ExecutionOutcome {
  hadFailures: boolean;
  outputRootAbs: string;
  outputRootDisplay: string;
  manifestPath: string;
  summaryPath: string;
  traceCostReportPath?: string;
  summary: SummaryArtifact;
}

// Trace analysis types

export type TraceAnalysisStatus =
  | "computed"
  | "pending"
  | "no_trace_id"
  | "pricing_missing"
  | "analysis_error";

export interface TraceUsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  costUsd: number | null;
}

export const ZERO_TRACE_TOTALS: TraceUsageTotals = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedInputTokens: 0,
  reasoningTokens: 0,
  costUsd: 0,
};

export interface TracePerModelCost {
  modelKey: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  costUsd: number | null;
}

export interface TraceAnalysisError {
  kind: "db" | "query" | "extract" | "pricing" | "unknown";
  message: string;
}

export interface TraceAnalysisResult {
  status: TraceAnalysisStatus;
  analyzedAtUtc: string;
  traceId?: string;
  attempts: number;
  spanCount: number;
  totals: TraceUsageTotals;
  perModel: TracePerModelCost[];
  warnings: string[];
  error?: TraceAnalysisError;
}

export interface TraceAnalysisSummary {
  analyzedRuns: number;
  pendingRuns: number;
  noTraceIdRuns: number;
  pricingMissingRuns: number;
  analysisErrorRuns: number;
  totals: TraceUsageTotals;
  perModel: TracePerModelCost[];
}

export interface TraceCostReportRun {
  caseId: string;
  repeatIndex: number;
  traceId?: string;
  status: TraceAnalysisStatus;
  totalTokens: number;
  costUsd: number | null;
}

export interface TraceCostReport {
  schemaVersion: string;
  experimentName: string;
  createdAtUtc: string;
  pricingCatalogVersion: string;
  source: {
    db: "postgresql";
    table: "public.mastra_ai_spans";
  };
  totals: TraceUsageTotals;
  perModel: TracePerModelCost[];
  runs: TraceCostReportRun[];
}

export interface ModelPricingEntry {
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  effectiveFrom?: string;
  notes?: string;
}

export interface PricingCatalog {
  version: string;
  models: Record<string, ModelPricingEntry>;
}

export interface TraceSpanRow {
  traceId: string;
  spanId: string;
  spanType: string;
  name: string;
  attributes: unknown;
  startedAt: string;
  endedAt: string;
}

export interface ExtractedSpanUsage {
  modelKey: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  usageReady: boolean;
  usageReadinessReason?: string;
  warnings: string[];
}

// Experiment config types (YAML)

export interface ExperimentConfig {
  name: string;
  description?: string;

  api: {
    baseUrl: string;
    workflowId: string;
    model?: string;
    timeoutMs: number;
  };

  testset: string;

  execution: {
    repetitions: number;
    concurrency: number;
  };

  trace: {
    enabled: boolean;
    database: string;
    pollTimeoutMs: number;
    pollIntervalMs: number;
  };

  output: {
    dir: string;
  };

  metadata: ThesisMetadata;
}

export type VegaSpec = Record<string, unknown>;
