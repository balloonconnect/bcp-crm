"use client";

/**
 * "Responsive charts" without a new charting dependency — plain
 * percentage-width bars that reflow with the container at any screen
 * size, the same "no new library for something this simple" instinct
 * behind other lightweight pieces of this codebase. Used whenever a
 * report's rows have a clear label + numeric value shape (source
 * breakdowns, event-type counts, team performance); anything else
 * falls back to the plain data table, which is the "data-table
 * alternative" for reports a bar chart doesn't suit.
 */
export function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-32 shrink-0 truncate text-muted-foreground">{d.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div className="h-full rounded bg-brand" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** True when every row looks like `{ someLabel: string, count/value/usageCount/completedTasks: number }` — a shape a bar chart can render meaningfully — so the report view can decide chart-vs-table automatically instead of a manual per-report toggle. */
export function tryExtractChartData(columns: { key: string }[], rows: Record<string, unknown>[]): { label: string; value: number }[] | null {
  if (columns.length !== 2 || rows.length === 0 || rows.length > 30) return null;
  const [labelKey, valueKey] = [columns[0]!.key, columns[1]!.key];
  if (!rows.every((r) => typeof r[valueKey] === "number")) return null;
  return rows.map((r) => ({ label: String(r[labelKey]), value: r[valueKey] as number }));
}
