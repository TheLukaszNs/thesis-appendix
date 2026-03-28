import React from "react";
import { useGradingStore } from "./store.ts";
import { ISSUE_CATALOG, type IssueTag } from "../types.ts";
import { Badge } from "./components/ui/badge.tsx";
import { Card, CardContent } from "./components/ui/card.tsx";
import { Toggle } from "./components/ui/toggle.tsx";

const CATEGORY_ORDER = [
  "SQL Structural",
  "SQL Semantic",
  "Visualization Type",
  "Visualization Readability",
  "Integration",
];

export function IssueChecklist() {
  const selectedIssues = useGradingStore((s) => s.selectedIssues);
  const toggleIssue = useGradingStore((s) => s.toggleIssue);
  const runs = useGradingStore((s) => s.runs);
  const selectedIndex = useGradingStore((s) => s.selectedIndex);

  const currentRun = runs[selectedIndex];
  const autoTags = currentRun?.sqlCheck?.errors?.map((e) => e.tag) ?? [];
  if (currentRun?.goldenSqlComparison?.status === "mismatch") {
    autoTags.push("result_mismatch");
  }

  const grouped: Record<string, IssueTag[]> = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = [];
  }
  for (const [tag, entry] of Object.entries(ISSUE_CATALOG)) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category]!.push(tag as IssueTag);
  }

  return (
    <Card className="py-4 gap-3">
      <CardContent className="space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const tags = grouped[cat];
          if (!tags || tags.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {cat}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isChecked = selectedIssues.includes(tag);
                  const isAuto = autoTags.includes(tag);
                  const label = ISSUE_CATALOG[tag]!.label;
                  return (
                    <Toggle
                      key={tag}
                      variant="outline"
                      size="sm"
                      pressed={isChecked}
                      onPressedChange={() => toggleIssue(tag)}
                      className={
                        isChecked
                          ? "rounded-full border-red-400 bg-red-500/10 text-red-700 dark:text-red-400 data-[state=on]:bg-red-500/10 data-[state=on]:text-red-700 dark:data-[state=on]:text-red-400 hover:bg-red-500/20"
                          : "rounded-full"
                      }
                    >
                      {isAuto && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 mr-0.5 uppercase tracking-wider rounded-sm">
                          auto
                        </Badge>
                      )}
                      {label}
                    </Toggle>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
