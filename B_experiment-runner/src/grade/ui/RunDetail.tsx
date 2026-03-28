import React from "react";
import { useGradingStore } from "./store.ts";
import { Card, CardContent } from "./components/ui/card.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs.tsx";
import { SqlCheckBanner } from "./SqlCheckBanner.tsx";
import { GoldenSqlBanner } from "./GoldenSqlBanner.tsx";
import { GradeForm } from "./GradeForm.tsx";
import { DataPreview } from "./DataPreview.tsx";

export function RunDetail() {
  const runs = useGradingStore((s) => s.runs);
  const selectedIndex = useGradingStore((s) => s.selectedIndex);
  const sqlText = useGradingStore((s) => s.sqlText);
  const hasDatabaseUrl = useGradingStore((s) => s.hasDatabaseUrl);
  const activeTab = useGradingStore((s) => s.activeTab);
  const setActiveTab = useGradingStore((s) => s.setActiveTab);

  const run = runs[selectedIndex];
  if (!run) return null;

  const runId = `${run.caseId} / run-${String(run.repeatIndex).padStart(4, "0")}`;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">{runId}</h1>
        <div className="text-xs text-muted-foreground mt-1">
          {run.success ? "Success" : "Failed"} &middot; {run.durationMs} ms
        </div>
      </div>

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Prompt
        </div>
        <Card className="py-0">
          <CardContent className="p-3 text-[13px] leading-relaxed whitespace-pre-wrap">
            {run.prompt}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sql" | "viz" | "grade")}>
        <TabsList className="mb-4">
          <TabsTrigger value="sql">SQL & Data</TabsTrigger>
          <TabsTrigger value="viz">Visualization</TabsTrigger>
          <TabsTrigger value="grade">Grade</TabsTrigger>
        </TabsList>

        <TabsContent value="sql" className="mt-0 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              SQL Query
            </div>
            <SqlCheckBanner sqlCheck={run.sqlCheck} />
            <GoldenSqlBanner goldenSqlComparison={run.goldenSqlComparison} />
            <pre className="bg-zinc-950 text-zinc-300 dark:bg-zinc-900 dark:border dark:border-border rounded-lg p-3 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
              {sqlText === null
                ? run.sqlPath
                  ? "Loading..."
                  : "No SQL available"
                : sqlText}
            </pre>
          </div>
          <DataPreview run={run} hasDatabaseUrl={hasDatabaseUrl} />
        </TabsContent>

        <TabsContent value="viz" className="mt-0">
          <Card className="py-0">
            <CardContent className="p-3 text-center">
              {run.imagePath ? (
                <img
                  className="max-w-full h-auto rounded"
                  src={`/api/image/${encodeURIComponent(run.caseId)}/${run.repeatIndex}`}
                  alt="Chart"
                />
              ) : (
                <div className="text-muted-foreground py-10 text-[13px]">
                  No image available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grade" className="mt-0">
          <GradeForm />
        </TabsContent>
      </Tabs>
    </>
  );
}
