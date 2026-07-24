"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/cn";

export interface ResponsiveSplitViewProps {
  /** The list/master pane (e.g. a ResponsiveCardList of leads). */
  primary: React.ReactNode;
  /** The detail pane, or `null` when nothing is selected yet. */
  detail: React.ReactNode | null;
  /** Shown in place of `detail` on wide screens when nothing is selected. */
  detailPlaceholder?: React.ReactNode;
  /** Called when the user taps "Back" from the detail pane on a narrow screen. */
  onBack?: () => void;
  primaryLabel?: string;
  detailLabel?: string;
  className?: string;
}

/**
 * Below `md` (tablet landscape), only one pane renders at a time — showing
 * the detail pane replaces the list rather than squeezing both into a
 * viewport too narrow for either to be usable, which is what "no essential
 * horizontal scrolling" rules out here. At `md`+, both panes render side by
 * side permanently.
 */
export function ResponsiveSplitView({
  primary,
  detail,
  detailPlaceholder,
  onBack,
  primaryLabel = "List",
  detailLabel = "Details",
  className,
}: ResponsiveSplitViewProps) {
  const showingDetailOnNarrow = detail !== null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col md:flex-row", className)}>
      <div
        aria-label={primaryLabel}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto md:max-w-sm md:flex-none md:border-r",
          showingDetailOnNarrow && "hidden md:block",
        )}
      >
        {primary}
      </div>

      <div
        aria-label={detailLabel}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          !showingDetailOnNarrow && "hidden md:block",
        )}
      >
        {showingDetailOnNarrow ? (
          <div className="flex min-h-full flex-col">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-touch-target items-center gap-2 border-b px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset md:hidden"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <div className="flex-1">{detail}</div>
          </div>
        ) : (
          <div className="hidden h-full items-center justify-center p-8 text-center text-sm text-muted-foreground md:flex">
            {detailPlaceholder}
          </div>
        )}
      </div>
    </div>
  );
}
