import { useEffect } from "react";
import { useGradingStore } from "./store.ts";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;

      const store = useGradingStore.getState();

      if (e.key >= "1" && e.key <= "5") {
        store.setScore(parseInt(e.key));
        e.preventDefault();
      } else if (e.key === "Enter") {
        store.saveGrade();
        e.preventDefault();
      } else if (e.key === "j" || e.key === "ArrowDown") {
        if (store.selectedIndex < store.runs.length - 1) {
          store.selectRun(store.selectedIndex + 1);
        }
        e.preventDefault();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        if (store.selectedIndex > 0) {
          store.selectRun(store.selectedIndex - 1);
        }
        e.preventDefault();
      } else if (e.key === "n") {
        const next = store.findNextUngraded();
        if (next >= 0) store.selectRun(next);
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // empty — getState() always reads fresh state at event time
}
