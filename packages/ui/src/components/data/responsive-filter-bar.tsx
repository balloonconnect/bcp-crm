"use client";

import * as React from "react";
import { useIsBreakpoint } from "../../hooks/use-breakpoint";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Badge } from "../primitives/badge";
import { MobileBottomSheet } from "../overlay/mobile-bottom-sheet";

export interface ActiveFilter {
  id: string;
  label: string;
  onRemove: () => void;
}

export interface ResponsiveFilterBarProps {
  /** Always-visible quick filters (e.g. status chips), rendered inline at every breakpoint. */
  quickFilters?: React.ReactNode;
  /** Currently applied filters, shown as removable chips. */
  activeFilters?: ActiveFilter[];
  /** Full filter form, shown inline on desktop and inside a bottom sheet on mobile. */
  advancedFilters?: React.ReactNode;
  advancedFiltersTitle?: string;
  className?: string;
}

/**
 * The one place in this system that intentionally allows horizontal
 * scrolling — a single row of quick-filter chips — because it's optional,
 * non-essential content (every chip is also reachable via the "Filters"
 * sheet), which keeps it consistent with the "no *essential* horizontal
 * scrolling" requirement.
 */
export function ResponsiveFilterBar({
  quickFilters,
  activeFilters,
  advancedFilters,
  advancedFiltersTitle = "Filters",
  className,
}: ResponsiveFilterBarProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const isTabletUp = useIsBreakpoint("sm");

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <div className="scrollbar-none flex flex-1 items-center gap-2 overflow-x-auto">
          {quickFilters}
        </div>

        {advancedFilters && (
          <>
            {!isTabletUp && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex min-h-touch-target shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {advancedFiltersTitle}
                {activeFilters && activeFilters.length > 0 && (
                  <Badge variant="brand" className="ml-0.5">
                    {activeFilters.length}
                  </Badge>
                )}
              </button>
            )}
            {!isTabletUp && (
              <MobileBottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title={advancedFiltersTitle}>
                {advancedFilters}
              </MobileBottomSheet>
            )}
            {isTabletUp && <div className="flex shrink-0 items-center gap-2">{advancedFilters}</div>}
          </>
        )}
      </div>

      {activeFilters && activeFilters.length > 0 && (
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto" aria-label="Active filters">
          {activeFilters.map((filter) => (
            <span
              key={filter.id}
              className="flex min-h-touch-target shrink-0 items-center gap-1.5 rounded-full border bg-secondary px-3 text-xs font-medium text-secondary-foreground"
            >
              {filter.label}
              <button
                type="button"
                onClick={filter.onRemove}
                aria-label={`Remove filter: ${filter.label}`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-background/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
