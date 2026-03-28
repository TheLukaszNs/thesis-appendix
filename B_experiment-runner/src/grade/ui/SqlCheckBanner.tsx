import React from "react";
import type { SqlCheckResult } from "../types.ts";
import { Alert, AlertDescription } from "./components/ui/alert.tsx";

interface Props {
  sqlCheck: SqlCheckResult | null;
}

export function SqlCheckBanner({ sqlCheck }: Props) {
  if (!sqlCheck) return null;

  if (sqlCheck.status === "skipped") {
    return (
      <Alert className="mb-3">
        <AlertDescription className="flex items-center gap-2">
          <span className="font-bold shrink-0">--</span>
          <span>SQL check: skipped (no SQL file)</span>
        </AlertDescription>
      </Alert>
    );
  }

  if (sqlCheck.status === "ok") {
    const rowInfo = sqlCheck.rowCount !== null ? ` (${sqlCheck.rowCount} rows)` : "";
    return (
      <Alert className="mb-3 border-green-500/50 text-green-700">
        <AlertDescription className="flex items-center gap-2 text-green-700">
          <span className="font-bold shrink-0">OK</span>
          <span>SQL check: passed{rowInfo}</span>
        </AlertDescription>
      </Alert>
    );
  }

  // error
  return (
    <Alert variant="destructive" className="mb-3">
      <AlertDescription>
        <div className="flex items-start gap-2">
          <span className="font-bold shrink-0">!!</span>
          <div>
            <span>
              SQL check: {sqlCheck.errors.length} issue{sqlCheck.errors.length !== 1 ? "s" : ""} found
            </span>
            {sqlCheck.errors.length > 0 && (
              <div className="text-xs mt-1 opacity-85">
                {sqlCheck.errors.map((e, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br />}
                    - {e.message}
                    {e.detail ? ` (${e.detail})` : ""}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
