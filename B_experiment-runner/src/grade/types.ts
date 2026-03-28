export type IssueTag =
  // SQL Structural (auto-detected via EXPLAIN)
  | "invalid_table"
  | "invalid_column"
  | "syntax_error"
  | "zero_rows"
  // SQL Semantic (manual)
  | "wrong_time_range"
  | "wrong_aggregation"
  | "missing_join"
  | "unnecessary_filter"
  | "wrong_granularity"
  // Visualization Type (manual)
  | "wrong_chart_type"
  | "missing_axis"
  | "swapped_axes"
  // Visualization Readability (manual)
  | "missing_title"
  | "missing_axis_labels"
  | "unreadable_legend"
  | "too_many_series"
  // Execution Accuracy (auto-detected via golden SQL)
  | "result_mismatch"
  // Integration (manual)
  | "viz_data_mismatch"
  | "invalid_output_shape";

export interface IssueCatalogEntry {
  category: string;
  label: string;
}

export const ISSUE_CATALOG: Record<IssueTag, IssueCatalogEntry> = {
  // SQL Structural
  invalid_table: { category: "SQL Structural", label: "References non-existent table" },
  invalid_column: { category: "SQL Structural", label: "References non-existent column" },
  syntax_error: { category: "SQL Structural", label: "SQL syntax error" },
  zero_rows: { category: "SQL Structural", label: "Query returns 0 rows" },
  // SQL Semantic
  wrong_time_range: { category: "SQL Semantic", label: "Wrong time range" },
  wrong_aggregation: { category: "SQL Semantic", label: "Wrong aggregation (SUM vs COUNT, missing GROUP BY)" },
  missing_join: { category: "SQL Semantic", label: "Missing table join" },
  unnecessary_filter: { category: "SQL Semantic", label: "Unnecessary filter narrowing results" },
  wrong_granularity: { category: "SQL Semantic", label: "Wrong granularity (monthly vs yearly)" },
  // Visualization Type
  wrong_chart_type: { category: "Visualization Type", label: "Wrong chart type for the data" },
  missing_axis: { category: "Visualization Type", label: "Missing axis or encoding" },
  swapped_axes: { category: "Visualization Type", label: "X and Y axes swapped" },
  // Visualization Readability
  missing_title: { category: "Visualization Readability", label: "Missing title" },
  missing_axis_labels: { category: "Visualization Readability", label: "Missing axis labels" },
  unreadable_legend: { category: "Visualization Readability", label: "Unreadable or missing legend" },
  too_many_series: { category: "Visualization Readability", label: "Too many data series" },
  // Execution Accuracy
  result_mismatch: { category: "SQL Semantic", label: "Result mismatch vs golden SQL" },
  // Integration
  viz_data_mismatch: { category: "Integration", label: "Visualization doesn't match SQL data" },
  invalid_output_shape: { category: "Integration", label: "Output format broken (invalid shape)" },
};

export const ALL_ISSUE_TAGS = Object.keys(ISSUE_CATALOG) as IssueTag[];

export interface SqlCheckError {
  tag: IssueTag;
  message: string;
  detail?: string;
}

export interface SqlCheckResult {
  status: "ok" | "error" | "skipped";
  errors: SqlCheckError[];
  rowCount: number | null;
}

export interface GradeEntry {
  caseId: string;
  repeatIndex: number;
  score: 1 | 2 | 3 | 4 | 5;
  note: string;
  issues: IssueTag[];
  gradedAtUtc: string;
  grader: string;
}

export interface GradesFile {
  schemaVersion: "agent-runner/grades/v1" | "agent-runner/grades/v2";
  experimentName: string;
  invocationDir: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  entries: GradeEntry[];
}

export interface GoldenSqlComparison {
  status: "match" | "mismatch" | "error" | "skipped" | "no_golden";
  goldenSql?: string;
  goldenRowCount?: number;
  predictedRowCount?: number;
  details?: string;
  columnDiffs?: { type: "missing" | "extra"; column: string }[];
  rowCountMatch?: boolean;
  contentMatch?: boolean;
}

export interface GradableRun {
  caseId: string;
  repeatIndex: number;
  prompt: string;
  success: boolean;
  durationMs: number;
  imagePath: string | null;
  sqlPath: string | null;
  runJsonPath: string | null;
  rowCount: number | null;
  sqlCheck: SqlCheckResult | null;
  goldenSqlComparison: GoldenSqlComparison | null;
  existingGrade: GradeEntry | null;
}

export interface GradableRunsResult {
  experimentName: string;
  invocationDir: string;
  invocationPathAbs: string;
  runs: GradableRun[];
  goldenSqlByCaseId: Map<string, string>;
  gradesFilePath: string;
}

export interface SqlChecksFile {
  schemaVersion: "agent-runner/sql-checks/v1";
  experimentName: string;
  invocationDir: string;
  createdAtUtc: string;
  databaseUrl: string;
  entries: Array<{ caseId: string; repeatIndex: number; result: SqlCheckResult }>;
}

export interface GoldenSqlResultsFile {
  schemaVersion: "agent-runner/golden-sql-results/v1";
  experimentName: string;
  invocationDir: string;
  createdAtUtc: string;
  databaseUrl: string;
  entries: Array<{ caseId: string; repeatIndex: number; result: GoldenSqlComparison }>;
}
