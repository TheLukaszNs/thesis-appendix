import type { GradableRun, IssueTag } from "../types.ts";

export async function fetchRuns(): Promise<GradableRun[]> {
  const res = await fetch("/api/runs");
  return res.json();
}

export async function fetchSql(caseId: string, repeatIndex: number): Promise<string> {
  const res = await fetch(`/api/sql/${encodeURIComponent(caseId)}/${repeatIndex}`);
  return res.text();
}

export interface SaveGradePayload {
  caseId: string;
  repeatIndex: number;
  score: number;
  note: string;
  issues: IssueTag[];
}

export interface SaveGradeResponse {
  ok: boolean;
  totalGraded?: number;
  error?: string;
}

export async function saveGrade(payload: SaveGradePayload): Promise<SaveGradeResponse> {
  const res = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export interface InfoResponse {
  experimentName: string;
  hasDatabaseUrl: boolean;
  hasGoldenSql?: boolean;
}

export async function fetchInfo(): Promise<InfoResponse> {
  const res = await fetch("/api/info");
  return res.json();
}

export interface DataResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export async function fetchData(caseId: string, repeatIndex: number): Promise<DataResponse> {
  const res = await fetch(`/api/data/${encodeURIComponent(caseId)}/${repeatIndex}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? "Failed to load data");
  }
  return res.json();
}

export async function executeSql(caseId: string, repeatIndex: number): Promise<DataResponse> {
  const res = await fetch(`/api/sql-execute/${encodeURIComponent(caseId)}/${repeatIndex}`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? "SQL execution failed");
  }
  return res.json();
}
