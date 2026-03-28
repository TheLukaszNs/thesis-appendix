import { ISSUE_CATALOG, type IssueTag } from "../grade/types.ts";
import type { LoadedInvocation } from "./loader.ts";
import { toRateWithCi, type RateWithCi } from "./metrics.ts";

export interface HumanEvaluationMetrics {
  gradedCount: number;
  totalRuns: number;
  coverageRate: number;
  meanScore: number;
  medianScore: number;
  stddevScore: number;
  scoreDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  acceptablePlusRate: RateWithCi;
  goodPlusRate: RateWithCi;
  issueFrequency: Record<string, number>;
  issueCategoryFrequency: Record<string, number>;
  issueDensity: number;
}

export interface ExecutionAccuracyMetrics {
  evaluatedCount: number;
  matchCount: number;
  mismatchCount: number;
  exRate: RateWithCi;
  exPassAt1: RateWithCi;
  exPassAtK: RateWithCi;
  rowCountAccuracyRate: RateWithCi;
}

export interface SqlValidityMetrics {
  checkedCount: number;
  okCount: number;
  errorCount: number;
  validityRate: RateWithCi;
  perErrorType: Record<string, { count: number; rate: number }>;
}

export interface CombinedMetrics {
  qualityAdjustedSuccessRate: RateWithCi;
}

export type CaseExStatus = "match" | "mismatch" | "mixed" | "no_data";

export interface CaseQualityMetric {
  caseId: string;
  meanScore: number | null;
  gradeCount: number;
  exStatus: CaseExStatus;
}

export interface GradingMetricsAvailable {
  available: true;
  human: HumanEvaluationMetrics | null;
  executionAccuracy: ExecutionAccuracyMetrics | null;
  sqlValidity: SqlValidityMetrics | null;
  combined: CombinedMetrics | null;
  perCase: CaseQualityMetric[];
}

export interface GradingMetricsUnavailable {
  available: false;
}

export type GradingMetrics = GradingMetricsAvailable | GradingMetricsUnavailable;

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function stddev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const sumSq = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

export function computeGradingMetrics(
  invocation: LoadedInvocation,
  canonicalCaseIds: string[],
): GradingMetrics {
  const { grading } = invocation;
  const hasGrades = grading.grades !== null && grading.grades.entries.length > 0;
  const hasSqlChecks = grading.sqlChecks !== null && grading.sqlChecks.entries.length > 0;
  const hasGoldenSql = grading.goldenSqlResults !== null && grading.goldenSqlResults.entries.length > 0;

  if (!hasGrades && !hasSqlChecks && !hasGoldenSql) {
    return { available: false };
  }

  // Build lookup maps
  const gradesByKey = new Map<string, typeof grading.grades extends { entries: (infer E)[] } | null ? E : never>();
  if (grading.grades) {
    for (const entry of grading.grades.entries) {
      gradesByKey.set(`${entry.caseId}:${entry.repeatIndex}`, entry);
    }
  }

  const goldenByKey = new Map<string, (typeof grading.goldenSqlResults extends { entries: (infer E)[] } | null ? E : never)>();
  if (grading.goldenSqlResults) {
    for (const entry of grading.goldenSqlResults.entries) {
      goldenByKey.set(`${entry.caseId}:${entry.repeatIndex}`, entry);
    }
  }

  const sqlCheckByKey = new Map<string, (typeof grading.sqlChecks extends { entries: (infer E)[] } | null ? E : never)>();
  if (grading.sqlChecks) {
    for (const entry of grading.sqlChecks.entries) {
      sqlCheckByKey.set(`${entry.caseId}:${entry.repeatIndex}`, entry);
    }
  }

  // Human evaluation metrics
  let human: HumanEvaluationMetrics | null = null;
  if (hasGrades) {
    const entries = grading.grades!.entries;
    const scores = entries.map((e) => e.score);
    const sorted = [...scores].sort((a, b) => a - b);
    const meanVal = scores.reduce((acc, v) => acc + v, 0) / scores.length;

    const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    for (const s of scores) {
      scoreDistribution[s as 1 | 2 | 3 | 4 | 5] += 1;
    }

    const acceptableCount = scores.filter((s) => s >= 3).length;
    const goodCount = scores.filter((s) => s >= 4).length;

    const issueFrequency: Record<string, number> = {};
    const issueCategoryFrequency: Record<string, number> = {};
    let totalIssues = 0;

    for (const entry of entries) {
      for (const tag of entry.issues) {
        issueFrequency[tag] = (issueFrequency[tag] ?? 0) + 1;
        totalIssues += 1;
        const category = ISSUE_CATALOG[tag as IssueTag]?.category ?? "Unknown";
        issueCategoryFrequency[category] = (issueCategoryFrequency[category] ?? 0) + 1;
      }
    }

    human = {
      gradedCount: entries.length,
      totalRuns: invocation.runs.length,
      coverageRate: invocation.runs.length > 0 ? entries.length / invocation.runs.length : 0,
      meanScore: meanVal,
      medianScore: median(sorted),
      stddevScore: stddev(scores, meanVal),
      scoreDistribution,
      acceptablePlusRate: toRateWithCi(acceptableCount, entries.length),
      goodPlusRate: toRateWithCi(goodCount, entries.length),
      issueFrequency,
      issueCategoryFrequency,
      issueDensity: entries.length > 0 ? totalIssues / entries.length : 0,
    };
  }

  // Execution accuracy metrics
  let executionAccuracy: ExecutionAccuracyMetrics | null = null;
  if (hasGoldenSql) {
    const entries = grading.goldenSqlResults!.entries;
    const evaluated = entries.filter(
      (e) => e.result.status === "match" || e.result.status === "mismatch",
    );
    const matchCount = evaluated.filter((e) => e.result.status === "match").length;
    const mismatchCount = evaluated.length - matchCount;

    // EX pass@1: per case, check if repeatIndex=1 has status=match
    let exPassAt1Count = 0;
    let exPassAtKCount = 0;
    const caseIdsWithGolden = new Set<string>();

    // Group golden results by caseId
    const goldenByCaseId = new Map<string, typeof entries>();
    for (const entry of evaluated) {
      caseIdsWithGolden.add(entry.caseId);
      const existing = goldenByCaseId.get(entry.caseId);
      if (existing) {
        existing.push(entry);
      } else {
        goldenByCaseId.set(entry.caseId, [entry]);
      }
    }

    for (const [, caseEntries] of goldenByCaseId) {
      const first = caseEntries.find((e) => e.repeatIndex === 1);
      if (first?.result.status === "match") exPassAt1Count += 1;
      if (caseEntries.some((e) => e.result.status === "match")) exPassAtKCount += 1;
    }

    const totalCasesEvaluated = caseIdsWithGolden.size;

    // Row count accuracy
    const withRowCountInfo = entries.filter(
      (e) => e.result.rowCountMatch !== undefined,
    );
    const rowCountMatchCount = withRowCountInfo.filter((e) => e.result.rowCountMatch === true).length;

    executionAccuracy = {
      evaluatedCount: evaluated.length,
      matchCount,
      mismatchCount,
      exRate: toRateWithCi(matchCount, evaluated.length),
      exPassAt1: toRateWithCi(exPassAt1Count, totalCasesEvaluated),
      exPassAtK: toRateWithCi(exPassAtKCount, totalCasesEvaluated),
      rowCountAccuracyRate: toRateWithCi(rowCountMatchCount, withRowCountInfo.length),
    };
  }

  // SQL validity metrics
  let sqlValidity: SqlValidityMetrics | null = null;
  if (hasSqlChecks) {
    const entries = grading.sqlChecks!.entries;
    const checked = entries.filter((e) => e.result.status !== "skipped");
    const okCount = checked.filter((e) => e.result.status === "ok").length;
    const errorCount = checked.length - okCount;

    const errorTypeCounts: Record<string, number> = {};
    for (const entry of checked) {
      if (entry.result.status === "error") {
        for (const err of entry.result.errors) {
          errorTypeCounts[err.tag] = (errorTypeCounts[err.tag] ?? 0) + 1;
        }
      }
    }

    const perErrorType: Record<string, { count: number; rate: number }> = {};
    for (const [tag, count] of Object.entries(errorTypeCounts)) {
      perErrorType[tag] = { count, rate: checked.length > 0 ? count / checked.length : 0 };
    }

    sqlValidity = {
      checkedCount: checked.length,
      okCount,
      errorCount,
      validityRate: toRateWithCi(okCount, checked.length),
      perErrorType,
    };
  }

  // Combined metrics: success AND score >= 3
  let combined: CombinedMetrics | null = null;
  if (hasGrades) {
    let qualitySuccessCount = 0;
    let totalEvaluated = 0;

    for (const run of invocation.runs) {
      const grade = gradesByKey.get(`${run.caseId}:${run.repeatIndex}`);
      if (grade) {
        totalEvaluated += 1;
        if (run.success && grade.score >= 3) {
          qualitySuccessCount += 1;
        }
      }
    }

    if (totalEvaluated > 0) {
      combined = {
        qualityAdjustedSuccessRate: toRateWithCi(qualitySuccessCount, totalEvaluated),
      };
    }
  }

  // Per-case quality metrics
  const perCase: CaseQualityMetric[] = [];
  for (const caseId of canonicalCaseIds) {
    // Mean score from grades
    const caseGrades: number[] = [];
    if (grading.grades) {
      for (const entry of grading.grades.entries) {
        if (entry.caseId === caseId) {
          caseGrades.push(entry.score);
        }
      }
    }
    const meanScore = caseGrades.length > 0
      ? caseGrades.reduce((a, b) => a + b, 0) / caseGrades.length
      : null;

    // EX status from golden results
    let exStatus: CaseExStatus = "no_data";
    if (grading.goldenSqlResults) {
      const caseGoldenEntries = grading.goldenSqlResults.entries.filter(
        (e) => e.caseId === caseId && (e.result.status === "match" || e.result.status === "mismatch"),
      );
      if (caseGoldenEntries.length > 0) {
        const hasMatch = caseGoldenEntries.some((e) => e.result.status === "match");
        const hasMismatch = caseGoldenEntries.some((e) => e.result.status === "mismatch");
        if (hasMatch && hasMismatch) exStatus = "mixed";
        else if (hasMatch) exStatus = "match";
        else exStatus = "mismatch";
      }
    }

    perCase.push({ caseId, meanScore, gradeCount: caseGrades.length, exStatus });
  }

  return {
    available: true,
    human,
    executionAccuracy,
    sqlValidity,
    combined,
    perCase,
  };
}
