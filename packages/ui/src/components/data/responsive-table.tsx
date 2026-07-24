import { cn } from "../../lib/cn";
import type { DataColumn, DataViewCommonProps } from "./data-view-types";

const hideBelowClass: Record<string, string> = {
  base: "",
  xs: "hidden xs:table-cell",
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const alignClass: Record<NonNullable<DataColumn<unknown>["align"]>, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
};

/**
 * Intended for `md`+ (tablet landscape and up) where a real table has room
 * to breathe. Rather than letting the table overflow and scroll
 * horizontally, columns marked `hideBelow` simply disappear at that tier —
 * pair with ResponsiveDataView so mobile gets ResponsiveCardList instead of
 * a cramped, scrolling table.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  renderRowActions,
}: DataViewCommonProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full caption-bottom text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  "h-11 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  alignClass[col.align ?? "start"],
                  col.hideBelow && hideBelowClass[col.hideBelow],
                )}
              >
                {col.header}
              </th>
            ))}
            {renderRowActions && <th scope="col" className="h-11 w-px px-4" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowId = getRowId(row);
            const clickable = Boolean(onRowClick);
            return (
              <tr
                key={rowId}
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
                  "border-b last:border-0",
                  clickable &&
                    "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "px-4 py-3",
                      alignClass[col.align ?? "start"],
                      col.hideBelow && hideBelowClass[col.hideBelow],
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
                {renderRowActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {renderRowActions(row)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
