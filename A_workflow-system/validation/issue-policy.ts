const HARD_ISSUE_PATTERNS = [
  /sql execution failed/i,
  /only read-only/i,
  /forbidden non-read-only/i,
  /visualization payload is not a valid json object/i,
  /must declare vega-lite v5 schema/i,
  /must use data source \{ name: 'query_result' \}/i,
  /missing a valid 'encoding' object/i,
  /missing in sql output columns/i,
  /invalid visualization spec/i,
  /failed to parse spec/i,
];

function dedupeIssues(issues: string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const issue of issues) {
    const normalized = issue.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function isHardIssue(issue: string): boolean {
  return HARD_ISSUE_PATTERNS.some((pattern) => pattern.test(issue));
}

export function splitValidationIssues(issues: string[]) {
  const all = dedupeIssues(issues);
  const hard: string[] = [];
  const soft: string[] = [];

  for (const issue of all) {
    if (isHardIssue(issue)) {
      hard.push(issue);
      continue;
    }

    soft.push(issue);
  }

  return { all, hard, soft };
}

export function getValidationScore(issues: string[]) {
  const split = splitValidationIssues(issues);

  if (split.hard.length > 0) {
    return 0;
  }

  if (split.soft.length === 0) {
    return 1;
  }

  return Math.max(0.65, 0.9 - split.soft.length * 0.05);
}
