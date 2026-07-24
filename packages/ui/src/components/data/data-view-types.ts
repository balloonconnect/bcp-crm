import type * as React from "react";
import type { BreakpointToken } from "../../tokens/breakpoints";

export interface DataColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Marks the field shown as the card title in ResponsiveCardList. Exactly one column should set this. */
  isPrimary?: boolean;
  /** In ResponsiveTable, hide this column below the given breakpoint instead of causing horizontal scroll. */
  hideBelow?: BreakpointToken;
  align?: "start" | "end" | "center";
  className?: string;
}

export interface DataViewCommonProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Optional per-row actions, rendered as a trailing action column / card row. */
  renderRowActions?: (row: T) => React.ReactNode;
}
