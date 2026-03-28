import React, { useState, useCallback } from "react";
import type { GradableRun } from "../types.ts";
import type { DataResponse } from "./api.ts";
import { fetchData, executeSql } from "./api.ts";
import { DataTable } from "./DataTable.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs.tsx";

type Tab = "stored" | "live";

interface Props {
  run: GradableRun;
  hasDatabaseUrl: boolean;
}

export function DataPreview({ run, hasDatabaseUrl }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("stored");
  const [storedData, setStoredData] = useState<DataResponse | null>(null);
  const [liveData, setLiveData] = useState<DataResponse | null>(null);
  const [storedLoading, setStoredLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [storedError, setStoredError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const loadStored = useCallback(async () => {
    if (storedData || storedLoading) return;
    setStoredLoading(true);
    setStoredError(null);
    try {
      const data = await fetchData(run.caseId, run.repeatIndex);
      setStoredData(data);
    } catch (err) {
      setStoredError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setStoredLoading(false);
    }
  }, [run.caseId, run.repeatIndex, storedData, storedLoading]);

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const data = await executeSql(run.caseId, run.repeatIndex);
      setLiveData(data);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : "SQL execution failed");
    } finally {
      setLiveLoading(false);
    }
  }, [run.caseId, run.repeatIndex]);

  const handleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    if (next && activeTab === "stored" && !storedData && !storedLoading) {
      loadStored();
    }
  }, [expanded, activeTab, storedData, storedLoading, loadStored]);

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      if (tab === "stored" && !storedData && !storedLoading) {
        loadStored();
      }
      if (tab === "live" && !liveData && !liveLoading) {
        loadLive();
      }
    },
    [storedData, storedLoading, liveData, liveLoading, loadStored, loadLive],
  );

  const renderContent = (
    loading: boolean,
    error: string | null,
    data: DataResponse | null,
    isLive: boolean,
  ) => {
    if (loading) {
      return (
        <div className="text-xs text-muted-foreground py-3 animate-pulse">
          {isLive ? "Running query..." : "Loading data..."}
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      );
    }
    if (data) {
      return (
        <DataTable
          columns={data.columns}
          rows={data.rows}
          rowCount={data.rowCount}
          truncated={data.truncated}
        />
      );
    }
    return null;
  };

  return (
    <div>
      {/* Header row: disclosure toggle */}
      <div className="flex items-center gap-3 mb-1.5">
        <button
          type="button"
          onClick={handleExpand}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className={`fill-current transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M2 0L8 4L2 8Z" />
          </svg>
          Data
          {run.rowCount !== null && (
            <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
              {run.rowCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <>
          {hasDatabaseUrl ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => handleTabChange(v as Tab)}
            >
              <div className="flex items-center justify-between mb-2">
                <TabsList className="h-7">
                  <TabsTrigger value="stored" className="text-[11px] h-6 px-2.5">
                    Stored
                  </TabsTrigger>
                  <TabsTrigger value="live" className="text-[11px] h-6 px-2.5">
                    Live
                  </TabsTrigger>
                </TabsList>
                {activeTab === "live" && liveData && (
                  <button
                    type="button"
                    onClick={loadLive}
                    disabled={liveLoading}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {liveLoading ? "running..." : "re-run"}
                  </button>
                )}
              </div>
              <TabsContent value="stored" className="mt-0">
                {renderContent(storedLoading, storedError, storedData, false)}
              </TabsContent>
              <TabsContent value="live" className="mt-0">
                {renderContent(liveLoading, liveError, liveData, true)}
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {renderContent(storedLoading, storedError, storedData, false)}
            </>
          )}
        </>
      )}
    </div>
  );
}
