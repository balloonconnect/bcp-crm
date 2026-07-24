"use client";

import * as React from "react";
import { defaultLayout, moveWidget, moveWidgetUp, moveWidgetDown, toggleWidgetVisibility, type DashboardLayout, type WidgetKey } from "@bcp/dashboard";
import { apiGet, apiPut } from "./api-client";

export type DashboardSummary = Record<string, unknown>;

interface DashboardContextValue {
  summary: DashboardSummary | null;
  layout: DashboardLayout;
  loading: boolean;
  error: string | null;
  customizing: boolean;
  setCustomizing: (value: boolean) => void;
  toggleWidget: (key: WidgetKey) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  reorderUp: (key: WidgetKey) => void;
  reorderDown: (key: WidgetKey) => void;
  refetch: () => Promise<void>;
}

const DashboardContext = React.createContext<DashboardContextValue | null>(null);

/**
 * Loads the summary (all 19 widgets' data, one request) and the signed-
 * in team member's saved layout in parallel, then persists layout edits
 * back to `PUT /dashboard/layout` — debounced, so dragging a widget
 * through several positions in a row doesn't fire a request per
 * intermediate position, just the final one.
 */
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [layout, setLayout] = React.useState<DashboardLayout>(defaultLayout());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customizing, setCustomizing] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const [summaryRes, layoutRes] = await Promise.all([
      apiGet<DashboardSummary>("/dashboard/summary"),
      apiGet<DashboardLayout>("/dashboard/layout"),
    ]);

    if (!summaryRes.ok) {
      setError(summaryRes.error?.message ?? "Could not load your dashboard");
    } else {
      setSummary(summaryRes.data ?? null);
    }
    if (layoutRes.ok && layoutRes.data) setLayout(layoutRes.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  function persistLayout(next: DashboardLayout) {
    setLayout(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void apiPut("/dashboard/layout", next);
    }, 400);
  }

  const value: DashboardContextValue = {
    summary,
    layout,
    loading,
    error,
    customizing,
    setCustomizing,
    toggleWidget: (key) => persistLayout(toggleWidgetVisibility(layout, key)),
    reorder: (fromIndex, toIndex) => persistLayout(moveWidget(layout, fromIndex, toIndex)),
    reorderUp: (key) => persistLayout(moveWidgetUp(layout, key)),
    reorderDown: (key) => persistLayout(moveWidgetDown(layout, key)),
    refetch,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = React.useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within a <DashboardProvider>");
  return ctx;
}
