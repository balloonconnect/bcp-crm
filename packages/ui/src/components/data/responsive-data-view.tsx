"use client";

import * as React from "react";
import { useIsBreakpoint } from "../../hooks/use-breakpoint";
import { ResponsiveTable } from "./responsive-table";
import { ResponsiveCardList } from "./responsive-card-list";
import { LoadingState } from "../states/loading-state";
import { EmptyState } from "../states/empty-state";
import type { DataViewCommonProps } from "./data-view-types";

export interface ResponsiveDataViewProps<T> extends DataViewCommonProps<T> {
  isLoading?: boolean;
  loadingLabel?: string;
  emptyState?: React.ReactNode;
  /** Force one layout regardless of breakpoint — mainly for Storybook/testing. */
  forceLayout?: "table" | "cards";
}

/**
 * The component most pages reach for: pass columns once, get an accessible
 * `<table>` at tablet-landscape+ (md, 768px) and a stacked card list below
 * that — same data, no information loss, never a horizontally-scrolling
 * table on a phone.
 */
export function ResponsiveDataView<T>({
  isLoading,
  loadingLabel = "Loading…",
  emptyState,
  forceLayout,
  ...props
}: ResponsiveDataViewProps<T>) {
  const isDesktopLayout = useIsBreakpoint("md");
  const useTable = forceLayout ? forceLayout === "table" : isDesktopLayout;

  if (isLoading) {
    return <LoadingState label={loadingLabel} />;
  }

  if (props.rows.length === 0) {
    return emptyState ?? <EmptyState title="Nothing here yet" />;
  }

  return useTable ? <ResponsiveTable {...props} /> : <ResponsiveCardList {...props} />;
}
