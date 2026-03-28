import { SQL } from "bun";

import { isRecord } from "../utils.ts";
import type { GradableRun, GoldenSqlComparison } from "./types.ts";

type Row = Record<string, unknown>;

const FLOAT_EPSILON = 1e-6;

/**
 * Normalize a column name: strip table prefix (e.g. "t.name" → "name"), lowercase.
 */
function normalizeColumnName(col: string): string {
  const dotIdx = col.lastIndexOf(".");
  const name = dotIdx >= 0 ? col.slice(dotIdx + 1) : col;
  return name.toLowerCase();
}

/**
 * Normalize a cell value to a canonical string for comparison.
 */
function normalizeValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") {
    // Try to detect date strings
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return val.trim();
  }
  return JSON.stringify(val);
}

/**
 * Check if two normalized value strings are equal, with float epsilon support.
 */
function valuesEqual(a: string, b: string): boolean {
  if (a === b) return true;

  // Try float comparison
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && a !== "NULL" && b !== "NULL") {
    return Math.abs(numA - numB) <= FLOAT_EPSILON;
  }

  return false;
}

/**
 * Serialize a row (with sorted, normalized columns) into a canonical string for sorting/comparison.
 */
function serializeRow(row: Row, sortedColumns: string[]): string {
  return sortedColumns.map((col) => normalizeValue(row[col])).join("\x00");
}

/**
 * Compare two serialized row strings element-by-element with float epsilon support.
 */
function rowStringsEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const aParts = a.split("\x00");
  const bParts = b.split("\x00");
  if (aParts.length !== bParts.length) return false;
  for (let i = 0; i < aParts.length; i++) {
    if (!valuesEqual(aParts[i]!, bParts[i]!)) return false;
  }
  return true;
}

export interface ComparisonResult {
  match: boolean;
  columnDiffs: { type: "missing" | "extra"; column: string }[];
  rowCountMatch: boolean;
  contentMatch: boolean;
  goldenRowCount: number;
  predictedRowCount: number;
  details?: string;
}

/**
 * Compare two result sets using set-based comparison with type normalization.
 * Follows standard EX (execution accuracy) methodology.
 */
export function compareResultSets(
  goldenRows: Row[],
  predictedRows: Row[],
): ComparisonResult {
  // Normalize column names
  const goldenColsRaw = goldenRows.length > 0 ? Object.keys(goldenRows[0]!) : [];
  const predictedColsRaw = predictedRows.length > 0 ? Object.keys(predictedRows[0]!) : [];

  const goldenCols = goldenColsRaw.map(normalizeColumnName).sort();
  const predictedCols = predictedColsRaw.map(normalizeColumnName).sort();

  // Column count check
  if (goldenCols.length !== predictedCols.length) {
    // Compute column diffs for diagnostics
    const goldenSet = new Set(goldenCols);
    const predictedSet = new Set(predictedCols);
    const columnDiffs: ComparisonResult["columnDiffs"] = [];
    for (const col of goldenCols) {
      if (!predictedSet.has(col)) columnDiffs.push({ type: "missing", column: col });
    }
    for (const col of predictedCols) {
      if (!goldenSet.has(col)) columnDiffs.push({ type: "extra", column: col });
    }
    return {
      match: false,
      columnDiffs,
      rowCountMatch: goldenRows.length === predictedRows.length,
      contentMatch: false,
      goldenRowCount: goldenRows.length,
      predictedRowCount: predictedRows.length,
      details: `Column count mismatch: golden=${goldenCols.length}, predicted=${predictedCols.length}`,
    };
  }

  // Row count check
  const rowCountMatch = goldenRows.length === predictedRows.length;

  if (!rowCountMatch) {
    return {
      match: false,
      columnDiffs: [],
      rowCountMatch: false,
      contentMatch: false,
      goldenRowCount: goldenRows.length,
      predictedRowCount: predictedRows.length,
      details: `Row count mismatch: golden=${goldenRows.length}, predicted=${predictedRows.length}`,
    };
  }

  // Check if column names match (after normalization)
  const columnsMatch = goldenCols.join(",") === predictedCols.join(",");

  if (columnsMatch) {
    // Column names match — compare by column name
    const sortedCols = goldenCols;

    function normalizeRow(row: Row): Row {
      const out: Row = {};
      for (const rawCol of Object.keys(row)) {
        out[normalizeColumnName(rawCol)] = row[rawCol];
      }
      return out;
    }

    const normalizedGolden = goldenRows.map(normalizeRow);
    const normalizedPredicted = predictedRows.map(normalizeRow);

    const goldenSerialized = normalizedGolden
      .map((row) => ({ row, key: serializeRow(row, sortedCols) }))
      .sort((a, b) => a.key.localeCompare(b.key));

    const predictedSerialized = normalizedPredicted
      .map((row) => ({ row, key: serializeRow(row, sortedCols) }))
      .sort((a, b) => a.key.localeCompare(b.key));

    for (let i = 0; i < goldenSerialized.length; i++) {
      const gRow = goldenSerialized[i]!.row;
      const pRow = predictedSerialized[i]!.row;

      for (const col of sortedCols) {
        const gVal = normalizeValue(gRow[col]);
        const pVal = normalizeValue(pRow[col]);
        if (!valuesEqual(gVal, pVal)) {
          return {
            match: false,
            columnDiffs: [],
            rowCountMatch: true,
            contentMatch: false,
            goldenRowCount: goldenRows.length,
            predictedRowCount: predictedRows.length,
            details: `Row ${i + 1}, column "${col}": golden="${gVal}" vs predicted="${pVal}"`,
          };
        }
      }
    }
  } else {
    // Column names differ — fall back to positional (value-based) comparison.
    // Serialize each row as sorted normalized values, ignoring column names.
    function serializeRowPositional(row: Row): string {
      return Object.values(row).map(normalizeValue).sort().join("\x00");
    }

    const goldenSerialized = goldenRows
      .map((row) => serializeRowPositional(row))
      .sort();

    const predictedSerialized = predictedRows
      .map((row) => serializeRowPositional(row))
      .sort();

    for (let i = 0; i < goldenSerialized.length; i++) {
      if (!rowStringsEqual(goldenSerialized[i]!, predictedSerialized[i]!)) {
        return {
          match: false,
          columnDiffs: [],
          rowCountMatch: true,
          contentMatch: false,
          goldenRowCount: goldenRows.length,
          predictedRowCount: predictedRows.length,
          details: `Row ${i + 1} values differ (positional comparison, column names ignored)`,
        };
      }
    }
  }

  return {
    match: true,
    columnDiffs: [],
    rowCountMatch: true,
    contentMatch: true,
    goldenRowCount: goldenRows.length,
    predictedRowCount: predictedRows.length,
  };
}

/**
 * Execute a SQL query against the database and return rows.
 */
async function executeQuery(db: InstanceType<typeof SQL>, query: string): Promise<Row[]> {
  const rawRows = await db.unsafe(query);
  return Array.from(rawRows) as Row[];
}

/**
 * Load predicted data from run.json → result.data
 */
async function loadPredictedData(runJsonPath: string): Promise<Row[] | null> {
  const file = Bun.file(runJsonPath);
  if (!(await file.exists())) return null;

  const runJson = await file.json();
  if (!isRecord(runJson)) return null;

  const result = (runJson as Record<string, unknown>).result;
  if (!isRecord(result)) return null;

  const data = (result as Record<string, unknown>).data;
  if (!Array.isArray(data)) return null;

  return data as Row[];
}

/**
 * Run golden SQL comparisons for all runs that have a golden SQL reference.
 * Caches golden SQL execution per caseId (same golden SQL across repetitions).
 */
export async function runGoldenSqlComparisons(
  runs: GradableRun[],
  goldenSqlByCaseId: Map<string, string>,
  databaseUrl: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  if (goldenSqlByCaseId.size === 0) return;

  const runsWithGolden = runs.filter(
    (r) => goldenSqlByCaseId.has(r.caseId) && r.runJsonPath !== null,
  );

  if (runsWithGolden.length === 0) {
    // Mark all runs without golden SQL
    for (const run of runs) {
      run.goldenSqlComparison = { status: "no_golden" };
    }
    return;
  }

  // Mark runs without golden SQL
  for (const run of runs) {
    if (!goldenSqlByCaseId.has(run.caseId)) {
      run.goldenSqlComparison = { status: "no_golden" };
    }
  }

  const db = new SQL(databaseUrl);

  // Cache golden SQL execution results per caseId
  const goldenResultsCache = new Map<string, Row[] | Error>();

  try {
    let completed = 0;

    for (const run of runsWithGolden) {
      completed++;
      onProgress?.(completed, runsWithGolden.length);

      const goldenSql = goldenSqlByCaseId.get(run.caseId)!;

      // Execute golden SQL (cached per caseId)
      let goldenRows: Row[];
      const cached = goldenResultsCache.get(run.caseId);
      if (cached !== undefined) {
        if (cached instanceof Error) {
          run.goldenSqlComparison = {
            status: "error",
            goldenSql,
            details: `Golden SQL execution failed: ${cached.message}`,
          };
          continue;
        }
        goldenRows = cached;
      } else {
        try {
          goldenRows = await executeQuery(db, goldenSql);
          goldenResultsCache.set(run.caseId, goldenRows);
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          goldenResultsCache.set(run.caseId, error);
          run.goldenSqlComparison = {
            status: "error",
            goldenSql,
            details: `Golden SQL execution failed: ${error.message}`,
          };
          continue;
        }
      }

      // Load predicted data from run.json
      if (!run.runJsonPath) {
        run.goldenSqlComparison = {
          status: "skipped",
          goldenSql,
          details: "No run.json available",
        };
        continue;
      }

      let predictedRows: Row[] | null;
      try {
        predictedRows = await loadPredictedData(run.runJsonPath);
      } catch {
        run.goldenSqlComparison = {
          status: "error",
          goldenSql,
          details: "Failed to load predicted data from run.json",
        };
        continue;
      }

      if (predictedRows === null) {
        run.goldenSqlComparison = {
          status: "skipped",
          goldenSql,
          details: "No predicted data in run.json",
        };
        continue;
      }

      // Compare
      const result = compareResultSets(goldenRows, predictedRows);

      run.goldenSqlComparison = {
        status: result.match ? "match" : "mismatch",
        goldenSql,
        goldenRowCount: result.goldenRowCount,
        predictedRowCount: result.predictedRowCount,
        columnDiffs: result.columnDiffs.length > 0 ? result.columnDiffs : undefined,
        rowCountMatch: result.rowCountMatch,
        contentMatch: result.contentMatch,
        details: result.details,
      };
    }
  } finally {
    await db.close();
  }
}
