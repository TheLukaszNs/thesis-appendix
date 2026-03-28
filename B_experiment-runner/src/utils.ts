import path from "node:path";

export function toUtcIso(date: Date = new Date()): string {
  return date.toISOString();
}

export function toInvocationDirName(utcIso: string): string {
  return utcIso.replaceAll(":", "-");
}

export function sanitizeCaseDirectoryName(caseId: string): string {
  const sanitized = caseId.trim().replace(/[^A-Za-z0-9._-]+/g, "-");
  if (!sanitized) {
    return "case";
  }
  return sanitized;
}

export function buildCaseDirectoryMap(caseIds: string[]): Map<string, string> {
  const used = new Map<string, number>();
  const mapping = new Map<string, string>();

  for (const caseId of caseIds) {
    const base = sanitizeCaseDirectoryName(caseId);
    const seen = used.get(base) ?? 0;

    if (seen === 0) {
      mapping.set(caseId, base);
    } else {
      mapping.set(caseId, `${base}-${String(seen + 1).padStart(2, "0")}`);
    }

    used.set(base, seen + 1);
  }

  return mapping;
}

export function toDisplayPath(absPath: string): string {
  const relative = path.relative(process.cwd(), absPath);
  return relative.length > 0 ? relative : ".";
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] ?? 0;
  }

  const fraction = index - lower;
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? 0;
  return lowerValue + (upperValue - lowerValue) * fraction;
}

export function structuredCloneSafe<T>(value: T): T {
  return structuredClone(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
