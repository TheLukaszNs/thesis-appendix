import { test, expect, describe } from "bun:test";
import { compareResultSets } from "./golden-sql.ts";

describe("compareResultSets", () => {
  test("exact match", () => {
    const golden = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const predicted = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
    expect(result.rowCountMatch).toBe(true);
    expect(result.contentMatch).toBe(true);
  });

  test("row order independence", () => {
    const golden = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const predicted = [
      { id: 2, name: "Bob" },
      { id: 1, name: "Alice" },
    ];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("column order independence", () => {
    const golden = [{ name: "Alice", id: 1 }];
    const predicted = [{ id: 1, name: "Alice" }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("table prefix stripping", () => {
    const golden = [{ "t.name": "Alice", "t.id": 1 }];
    const predicted = [{ name: "Alice", id: 1 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("float epsilon comparison", () => {
    const golden = [{ value: 3.14159265 }];
    const predicted = [{ value: 3.1415926500001 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("float mismatch beyond epsilon", () => {
    const golden = [{ value: 3.14 }];
    const predicted = [{ value: 3.15 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
    expect(result.contentMatch).toBe(false);
  });

  test("date normalization", () => {
    const golden = [{ created: "2025-01-15T00:00:00.000Z" }];
    const predicted = [{ created: "2025-01-15" }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("null handling", () => {
    const golden = [{ id: 1, name: null }];
    const predicted = [{ id: 1, name: null }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("null vs value is mismatch", () => {
    const golden = [{ id: 1, name: null }];
    const predicted = [{ id: 1, name: "Alice" }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
  });

  test("column count mismatch — fewer columns", () => {
    const golden = [{ id: 1, name: "Alice", age: 30 }];
    const predicted = [{ id: 1, name: "Alice" }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
    expect(result.columnDiffs).toEqual([{ type: "missing", column: "age" }]);
  });

  test("column count mismatch — more columns", () => {
    const golden = [{ id: 1 }];
    const predicted = [{ id: 1, extra: "value" }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
    expect(result.columnDiffs).toEqual([{ type: "extra", column: "extra" }]);
  });

  test("different column names with same values — positional match", () => {
    const golden = [{ amount_range: "0-1000", avg_gpa: 3.5, count: 10 }];
    const predicted = [{ scholarship_range: "0-1000", average_gpa: 3.5, student_count: 10 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("different column names with different values — positional mismatch", () => {
    const golden = [{ amount_range: "0-1000", avg_gpa: 3.5, count: 10 }];
    const predicted = [{ scholarship_range: "0-1000", average_gpa: 3.9, student_count: 10 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
    expect(result.contentMatch).toBe(false);
  });

  test("row count mismatch", () => {
    const golden = [
      { id: 1 },
      { id: 2 },
    ];
    const predicted = [{ id: 1 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
    expect(result.rowCountMatch).toBe(false);
    expect(result.goldenRowCount).toBe(2);
    expect(result.predictedRowCount).toBe(1);
  });

  test("multiset semantics — duplicate rows matter", () => {
    const golden = [
      { id: 1, name: "Alice" },
      { id: 1, name: "Alice" },
    ];
    const predicted = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(false);
  });

  test("multiset semantics — same duplicates match", () => {
    const golden = [
      { id: 1, name: "Alice" },
      { id: 1, name: "Alice" },
    ];
    const predicted = [
      { id: 1, name: "Alice" },
      { id: 1, name: "Alice" },
    ];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("mixed types — string '42' vs number 42", () => {
    const golden = [{ value: 42 }];
    const predicted = [{ value: "42" }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("boolean normalization", () => {
    const golden = [{ active: true }];
    const predicted = [{ active: true }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });

  test("empty result sets match", () => {
    const result = compareResultSets([], []);
    expect(result.match).toBe(true);
    expect(result.goldenRowCount).toBe(0);
    expect(result.predictedRowCount).toBe(0);
  });

  test("case-insensitive column names", () => {
    const golden = [{ Name: "Alice", ID: 1 }];
    const predicted = [{ name: "Alice", id: 1 }];
    const result = compareResultSets(golden, predicted);
    expect(result.match).toBe(true);
  });
});
