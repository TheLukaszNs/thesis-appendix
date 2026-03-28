import path from "node:path";

import { UserInputError } from "../errors.ts";
import type { PromptCase } from "../types.ts";
import { isRecord } from "../utils.ts";

export async function loadTestset(testsetPathRaw: string): Promise<PromptCase[]> {
  const testsetPathAbs = path.resolve(process.cwd(), testsetPathRaw);
  const file = Bun.file(testsetPathAbs);

  if (!(await file.exists())) {
    throw new UserInputError(`Testset file does not exist: ${testsetPathRaw}`);
  }

  const content = await file.text();
  const lines = content.split(/\r?\n/);
  const cases: PromptCase[] = [];
  const seenIds = new Set<string>();

  for (let idx = 0; idx < lines.length; idx += 1) {
    const rawLine = lines[idx] ?? "";
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new UserInputError(`Invalid JSON at ${testsetPathRaw}:${idx + 1}`);
    }

    if (!isRecord(parsed)) {
      throw new UserInputError(
        `Testset entry must be an object at ${testsetPathRaw}:${idx + 1}`,
      );
    }

    const id = parsed.id;
    const prompt = parsed.prompt;

    if (typeof id !== "string" || id.trim().length === 0) {
      throw new UserInputError(
        `Missing or invalid 'id' at ${testsetPathRaw}:${idx + 1}`,
      );
    }

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new UserInputError(
        `Missing or invalid 'prompt' at ${testsetPathRaw}:${idx + 1}`,
      );
    }

    if (seenIds.has(id)) {
      throw new UserInputError(
        `Duplicate testset id '${id}' in ${testsetPathRaw}:${idx + 1}`,
      );
    }
    seenIds.add(id);

    const metadata = isRecord(parsed.metadata)
      ? (parsed.metadata as Record<string, unknown>)
      : undefined;
    const request = "request" in parsed ? parsed.request : undefined;

    const rawGoldenSql = parsed.golden_sql;
    const golden_sql =
      typeof rawGoldenSql === "string" && rawGoldenSql.trim().length > 0
        ? rawGoldenSql.trim()
        : undefined;

    cases.push({
      id,
      prompt,
      golden_sql,
      metadata,
      request,
      sourceLine: idx + 1,
    });
  }

  if (cases.length === 0) {
    throw new UserInputError(`No test cases found in ${testsetPathRaw}`);
  }

  return cases;
}
