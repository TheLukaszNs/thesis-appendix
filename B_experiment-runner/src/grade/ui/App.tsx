import React, { useEffect } from "react";
import { useGradingStore } from "./store.ts";
import { AppSidebar } from "./Sidebar.tsx";
import { RunDetail } from "./RunDetail.tsx";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar.tsx";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts.ts";
import { useTheme } from "./useTheme.ts";

export function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const runs = useGradingStore((s) => s.runs);
  const selectedIndex = useGradingStore((s) => s.selectedIndex);
  const initialize = useGradingStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  useKeyboardShortcuts();

  const currentRun = selectedIndex >= 0 ? runs[selectedIndex] : null;

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "17.5rem" } as React.CSSProperties}
    >
      <AppSidebar theme={theme} onToggleTheme={toggleTheme} />
      <SidebarInset className="overflow-y-auto p-6 px-8">
        {currentRun ? (
          <RunDetail
            key={`${currentRun.caseId}-${currentRun.repeatIndex}`}
          />
        ) : (
          <div className="text-center text-muted-foreground mt-30 text-sm">
            Select a run from the sidebar to begin grading.
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
