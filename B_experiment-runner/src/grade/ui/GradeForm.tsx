import React from "react";
import { useGradingStore } from "./store.ts";
import { Button } from "./components/ui/button.tsx";
import { Card, CardContent } from "./components/ui/card.tsx";
import { Textarea } from "./components/ui/textarea.tsx";
import { IssueChecklist } from "./IssueChecklist.tsx";
import { cn } from "./lib/utils.ts";

const SCORE_LABELS: Record<number, string> = {
  1: "Broken",
  2: "Major issues",
  3: "Acceptable",
  4: "Good",
  5: "Excellent",
};

// Active color classes per score, designed for light + dark
const SCORE_COLORS: Record<number, string> = {
  1: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
  2: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  3: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  4: "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  5: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function GradeForm() {
  const selectedScore = useGradingStore((s) => s.selectedScore);
  const note = useGradingStore((s) => s.note);
  const saveStatus = useGradingStore((s) => s.saveStatus);
  const setScore = useGradingStore((s) => s.setScore);
  const setNote = useGradingStore((s) => s.setNote);
  const saveGrade = useGradingStore((s) => s.saveGrade);

  return (
    <Card className="py-4 gap-3">
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              variant="outline"
              className={cn(
                "flex-1 h-auto py-2.5 flex flex-col gap-0.5",
                selectedScore === n && SCORE_COLORS[n],
              )}
              onClick={() => setScore(n)}
            >
              <span className="text-lg font-bold">{n}</span>
              <span className="text-[10px] text-muted-foreground">{SCORE_LABELS[n]}</span>
            </Button>
          ))}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-1">
          Issues
        </div>
        <IssueChecklist />

        <Textarea
          placeholder="Optional note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="resize-y text-[13px]"
        />

        <div className="flex items-center gap-3">
          <Button
            disabled={!selectedScore}
            onClick={() => saveGrade()}
          >
            Save Grade
          </Button>
          <span
            className={cn(
              "text-xs",
              saveStatus === "Saved!" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
            )}
          >
            {saveStatus}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Keyboard: 1-5 score, Enter save, j/k navigate, n next ungraded
        </div>
      </CardContent>
    </Card>
  );
}
