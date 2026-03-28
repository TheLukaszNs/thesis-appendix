import React from "react";
import { useGradingStore, type FilterValue } from "./store.ts";
import type { GradableRun } from "../types.ts";
import { Badge } from "./components/ui/badge.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "./components/ui/sidebar.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select.tsx";
import { Moon, Sun } from "lucide-react";
import { cn } from "./lib/utils.ts";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AppSidebar({ theme, onToggleTheme }: Props) {
  const runs = useGradingStore((s) => s.runs);
  const selectedIndex = useGradingStore((s) => s.selectedIndex);
  const filter = useGradingStore((s) => s.filter);
  const experimentName = useGradingStore((s) => s.experimentName);
  const hasGoldenSql = useGradingStore((s) => s.hasGoldenSql);
  const selectRun = useGradingStore((s) => s.selectRun);
  const setFilter = useGradingStore((s) => s.setFilter);

  const total = runs.length;
  const gradedCount = runs.filter((r) => r.existingGrade).length;
  const pct = total > 0 ? Math.round((gradedCount / total) * 100) : 0;

  const exCompared = runs.filter(
    (r) => r.goldenSqlComparison?.status === "match" || r.goldenSqlComparison?.status === "mismatch",
  );
  const exMatches = exCompared.filter((r) => r.goldenSqlComparison?.status === "match");
  const exPct = exCompared.length > 0 ? Math.round((exMatches.length / exCompared.length) * 100) : 0;

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 gap-0 border-b border-sidebar-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{experimentName}</h2>
            <div className="text-xs text-sidebar-foreground/60 mt-1">
              {gradedCount} / {total} graded
              {hasGoldenSql && exCompared.length > 0 && (
                <span className="ml-2">
                  &middot; EX {exPct}% ({exMatches.length}/{exCompared.length})
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="mt-0.5 shrink-0 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {total > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-sidebar-accent overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </SidebarHeader>

      <div className="px-3 py-2 border-b border-sidebar-border">
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
          <SelectTrigger size="sm" className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All runs</SelectItem>
            <SelectItem value="ungraded">Ungraded only</SelectItem>
            <SelectItem value="graded">Graded only</SelectItem>
            <SelectItem value="failed">Failed runs</SelectItem>
            {hasGoldenSql && <SelectItem value="ex_match">EX match</SelectItem>}
            {hasGoldenSql && <SelectItem value="ex_mismatch">EX mismatch</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <SidebarContent className="gap-0 overflow-y-auto">
        <SidebarMenu className="gap-0 p-0">
          {runs.map((run, i) => {
            const show =
              filter === "all" ||
              (filter === "ungraded" && !run.existingGrade) ||
              (filter === "graded" && !!run.existingGrade) ||
              (filter === "failed" && !run.success) ||
              (filter === "ex_match" && run.goldenSqlComparison?.status === "match") ||
              (filter === "ex_mismatch" && run.goldenSqlComparison?.status === "mismatch");
            if (!show) return null;

            const exStatus = run.goldenSqlComparison?.status;

            const dotColor = !run.success
              ? "bg-red-500"
              : run.existingGrade
                ? "bg-emerald-500"
                : "bg-sidebar-foreground/25";

            const isActive = i === selectedIndex;

            return (
              <SidebarMenuItem key={`${run.caseId}-${run.repeatIndex}`}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => selectRun(i)}
                  className={cn(
                    "rounded-none h-auto py-2.5 px-4 text-[13px] border-b border-sidebar-border/40",
                    isActive
                      ? "bg-blue-50 border-l-[3px] border-l-blue-600 dark:bg-blue-950/40 dark:border-l-blue-400"
                      : "border-l-[3px] border-l-transparent",
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {run.caseId} / run-{String(run.repeatIndex).padStart(4, "0")}
                  </span>
                  {exStatus === "match" && (
                    <Badge className="bg-green-600 text-white text-[9px] px-1 py-0 uppercase tracking-wider">
                      EX
                    </Badge>
                  )}
                  {exStatus === "mismatch" && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 uppercase tracking-wider">
                      EX
                    </Badge>
                  )}
                  {run.existingGrade && (
                    <Badge variant="secondary" className="text-[11px] px-1.5 py-0 tabular-nums">
                      {run.existingGrade.score}/5
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
