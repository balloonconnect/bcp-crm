import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import type { DataViewCommonProps } from "./data-view-types";

/**
 * The mobile/tablet-portrait counterpart to ResponsiveTable: each row
 * becomes a card with the primary column as the title and every other
 * column as a label/value pair — no data is dropped, it just restacks
 * vertically instead of requiring horizontal scroll.
 */
export function ResponsiveCardList<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  renderRowActions,
}: DataViewCommonProps<T>) {
  const primaryColumn = columns.find((c) => c.isPrimary) ?? columns[0];
  const secondaryColumns = columns.filter((c) => c.id !== primaryColumn?.id);

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const rowId = getRowId(row);
        const clickable = Boolean(onRowClick);

        return (
          <li key={rowId}>
            <div
              tabIndex={clickable ? 0 : undefined}
              role={clickable ? "button" : undefined}
              onClick={clickable ? () => onRowClick?.(row) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick?.(row);
                      }
                    }
                  : undefined
              }
              className={cn(
                "flex min-h-touch-target items-start gap-3 rounded-lg border bg-card p-4",
                clickable &&
                  "cursor-pointer hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              <div className="min-w-0 flex-1">
                {primaryColumn && (
                  <p className="truncate text-sm font-semibold">{primaryColumn.cell(row)}</p>
                )}
                <dl className="mt-1.5 flex flex-col gap-1">
                  {secondaryColumns.map((col) => (
                    <div key={col.id} className="flex items-baseline gap-1.5 text-sm">
                      <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                        {col.header}
                      </dt>
                      <dd className="min-w-0 truncate text-foreground/90">{col.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
                {renderRowActions && (
                  <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    {renderRowActions(row)}
                  </div>
                )}
              </div>
              {clickable && (
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
