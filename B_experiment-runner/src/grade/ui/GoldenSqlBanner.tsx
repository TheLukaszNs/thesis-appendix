import React, { useState } from "react";
import type { GoldenSqlComparison } from "../types.ts";
import { Alert, AlertDescription } from "./components/ui/alert.tsx";
import { Badge } from "./components/ui/badge.tsx";

interface Props {
  goldenSqlComparison: GoldenSqlComparison | null;
}

export function GoldenSqlBanner({ goldenSqlComparison }: Props) {
  const [showSql, setShowSql] = useState(false);

  if (!goldenSqlComparison) return null;
  if (goldenSqlComparison.status === "no_golden" || goldenSqlComparison.status === "skipped") {
    return null;
  }

  if (goldenSqlComparison.status === "match") {
    return (
      <Alert className="mb-3 border-green-500/50 text-green-700">
        <AlertDescription className="flex items-center gap-2 text-green-700">
          <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 uppercase tracking-wider">
            EX: pass
          </Badge>
          <span>
            Results match golden SQL
            {goldenSqlComparison.goldenRowCount != null && ` (${goldenSqlComparison.goldenRowCount} rows)`}
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (goldenSqlComparison.status === "error") {
    return (
      <Alert className="mb-3 border-amber-500/50 text-amber-700">
        <AlertDescription>
          <div className="flex items-start gap-2 text-amber-700">
            <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0 uppercase tracking-wider shrink-0 mt-0.5">
              EX: error
            </Badge>
            <span className="text-xs">{goldenSqlComparison.details ?? "Golden SQL comparison failed"}</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // mismatch
  return (
    <Alert variant="destructive" className="mb-3">
      <AlertDescription>
        <div className="flex items-start gap-2">
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 uppercase tracking-wider shrink-0 mt-0.5">
            EX: fail
          </Badge>
          <div className="space-y-1.5 text-xs">
            <div>
              Results differ from golden SQL
              {goldenSqlComparison.goldenRowCount != null && goldenSqlComparison.predictedRowCount != null && (
                <span className="ml-1 opacity-85">
                  (golden: {goldenSqlComparison.goldenRowCount} rows, predicted: {goldenSqlComparison.predictedRowCount} rows)
                </span>
              )}
            </div>

            {goldenSqlComparison.columnDiffs && goldenSqlComparison.columnDiffs.length > 0 && (
              <div className="opacity-85">
                Column differences:{" "}
                {goldenSqlComparison.columnDiffs.map((d, i) => (
                  <span key={i}>
                    {i > 0 && ", "}
                    <span className={d.type === "missing" ? "text-red-400" : "text-amber-400"}>
                      {d.type === "missing" ? "missing" : "extra"} &quot;{d.column}&quot;
                    </span>
                  </span>
                ))}
              </div>
            )}

            {goldenSqlComparison.details && !goldenSqlComparison.columnDiffs?.length && (
              <div className="opacity-85">{goldenSqlComparison.details}</div>
            )}

            {goldenSqlComparison.goldenSql && (
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100"
              >
                {showSql ? "Hide" : "Show"} golden SQL
              </button>
            )}

            {showSql && goldenSqlComparison.goldenSql && (
              <pre className="bg-zinc-950 text-zinc-300 dark:bg-zinc-900 dark:border dark:border-border rounded p-2 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all mt-1">
                {goldenSqlComparison.goldenSql}
              </pre>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
