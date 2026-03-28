import path from "node:path";

import { writeJson } from "../artifacts/writer.ts";
import { toUtcIso } from "../utils.ts";
import type { GradeEntry, GradesFile } from "./types.ts";

const GRADES_FILENAME = "grades.json";
const SCHEMA_VERSION = "agent-runner/grades/v2" as const;

export function gradesFilePath(invocationPathAbs: string): string {
  return path.join(invocationPathAbs, GRADES_FILENAME);
}

export async function loadGrades(invocationPathAbs: string): Promise<GradesFile | null> {
  const filePath = gradesFilePath(invocationPathAbs);
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    return null;
  }

  const raw = (await file.json()) as GradesFile;

  // Backwards compatibility: v1 entries may lack issues field
  for (const entry of raw.entries) {
    if (!entry.issues) {
      entry.issues = [];
    }
  }

  return raw;
}

export async function saveGrade(
  invocationPathAbs: string,
  experimentName: string,
  invocationDir: string,
  entry: GradeEntry,
): Promise<GradesFile> {
  const now = toUtcIso();
  let grades = await loadGrades(invocationPathAbs);

  if (!grades) {
    grades = {
      schemaVersion: SCHEMA_VERSION,
      experimentName,
      invocationDir,
      createdAtUtc: now,
      updatedAtUtc: now,
      entries: [],
    };
  }

  // Upgrade schema version on save
  grades.schemaVersion = SCHEMA_VERSION;

  // Upsert: replace existing entry for same caseId + repeatIndex
  const existingIndex = grades.entries.findIndex(
    (e) => e.caseId === entry.caseId && e.repeatIndex === entry.repeatIndex,
  );

  if (existingIndex >= 0) {
    grades.entries[existingIndex] = entry;
  } else {
    grades.entries.push(entry);
  }

  grades.updatedAtUtc = now;

  await writeJson(gradesFilePath(invocationPathAbs), grades);
  return grades;
}
