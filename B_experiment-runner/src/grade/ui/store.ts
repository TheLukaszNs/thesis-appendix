import { create } from "zustand";
import type { GradableRun, IssueTag } from "../types.ts";
import { fetchRuns, fetchSql, saveGrade as apiSaveGrade, fetchInfo } from "./api.ts";

export type FilterValue = "all" | "ungraded" | "graded" | "failed" | "ex_match" | "ex_mismatch";

interface GradingState {
  runs: GradableRun[];
  experimentName: string;
  hasDatabaseUrl: boolean;
  hasGoldenSql: boolean;
  selectedIndex: number;
  filter: FilterValue;
  selectedScore: number | null;
  selectedIssues: IssueTag[];
  note: string;
  saveStatus: string;
  sqlText: string | null;
  activeTab: "sql" | "viz" | "grade";
}

interface GradingActions {
  initialize: () => Promise<void>;
  selectRun: (index: number) => void;
  setFilter: (filter: FilterValue) => void;
  setScore: (score: number) => void;
  toggleIssue: (tag: IssueTag) => void;
  setNote: (note: string) => void;
  saveGrade: () => Promise<void>;
  setActiveTab: (tab: "sql" | "viz" | "grade") => void;
  findNextUngraded: () => number;
}

export type GradingStore = GradingState & GradingActions;

export const useGradingStore = create<GradingStore>((set, get) => ({
  runs: [],
  experimentName: "Expert Grading",
  hasDatabaseUrl: false,
  hasGoldenSql: false,
  selectedIndex: -1,
  filter: "all",
  selectedScore: null,
  selectedIssues: [],
  note: "",
  saveStatus: "",
  sqlText: null,
  activeTab: "sql",

  initialize: async () => {
    const [runsData] = await Promise.all([
      fetchRuns(),
      fetchInfo()
        .then((info) => {
          set({
            experimentName: info.experimentName,
            hasDatabaseUrl: info.hasDatabaseUrl ?? false,
            hasGoldenSql: info.hasGoldenSql ?? false,
          });
        })
        .catch(() => {}),
    ]);

    set({ runs: runsData });
    if (runsData.length > 0) {
      get().selectRun(0);
    }
  },

  selectRun: (index: number) => {
    const { runs } = get();
    const run = runs[index];
    if (!run) return;

    const existingScore = run.existingGrade?.score ?? null;
    const existingIssues = run.existingGrade?.issues ?? [];
    const autoTags = run.sqlCheck?.errors?.map((e) => e.tag) ?? [];
    if (run.goldenSqlComparison?.status === "mismatch") {
      autoTags.push("result_mismatch");
    }

    const merged = [...existingIssues];
    for (const tag of autoTags) {
      if (!merged.includes(tag)) merged.push(tag);
    }

    set({
      selectedIndex: index,
      saveStatus: "",
      selectedScore: existingScore,
      selectedIssues: merged,
      note: run.existingGrade?.note ?? "",
      sqlText: null,
      activeTab: "sql",
    });

    if (run.sqlPath) {
      fetchSql(run.caseId, run.repeatIndex)
        .then((text) => set({ sqlText: text }))
        .catch(() => set({ sqlText: "Failed to load SQL" }));
    }
  },

  setFilter: (filter) => set({ filter }),

  setScore: (score) => set({ selectedScore: score }),

  toggleIssue: (tag) =>
    set((state) => ({
      selectedIssues: state.selectedIssues.includes(tag)
        ? state.selectedIssues.filter((t) => t !== tag)
        : [...state.selectedIssues, tag],
    })),

  setNote: (note) => set({ note }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  saveGrade: async () => {
    const { selectedScore, selectedIndex, runs, selectedIssues, note } = get();
    if (!selectedScore || selectedIndex < 0) return;
    const run = runs[selectedIndex];
    if (!run) return;

    set({ saveStatus: "Saving..." });

    try {
      const res = await apiSaveGrade({
        caseId: run.caseId,
        repeatIndex: run.repeatIndex,
        score: selectedScore,
        note: note.trim(),
        issues: selectedIssues,
      });

      if (res.ok) {
        const updatedRun: GradableRun = {
          ...run,
          existingGrade: {
            caseId: run.caseId,
            repeatIndex: run.repeatIndex,
            score: selectedScore as 1 | 2 | 3 | 4 | 5,
            note: note.trim(),
            issues: [...selectedIssues],
            gradedAtUtc: new Date().toISOString(),
            grader: "default",
          },
        };
        const updated = [...runs];
        updated[selectedIndex] = updatedRun;
        set({ runs: updated, saveStatus: "Saved!" });

        setTimeout(() => {
          const { selectedIndex: idx, runs: r } = get();
          const next = r.findIndex((run, i) => i > idx && !run.existingGrade);
          const target = next >= 0 ? next : r.findIndex((run) => !run.existingGrade);
          if (target >= 0) get().selectRun(target);
        }, 300);
      } else {
        set({ saveStatus: "Error saving" });
      }
    } catch {
      set({ saveStatus: "Error saving" });
    }
  },

  findNextUngraded: () => {
    const { runs, selectedIndex } = get();
    const next = runs.findIndex((r, i) => i > selectedIndex && !r.existingGrade);
    if (next >= 0) return next;
    return runs.findIndex((r) => !r.existingGrade);
  },
}));
