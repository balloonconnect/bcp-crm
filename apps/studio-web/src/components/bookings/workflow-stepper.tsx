"use client";

import { Check } from "lucide-react";
import { cn } from "@bcp/ui";
import { WORKFLOW_STAGE_KEYS, BOOKING_STAGES, getBookingStage } from "@bcp/bookings";

/**
 * The "visual booking timeline and workflow" — a horizontal stepper
 * (scrollable on mobile) showing the 10 open-pipeline stages in order,
 * with everything before the current stage marked complete, the current
 * stage highlighted, and a click-to-advance affordance on the very next
 * stage only (skipping ahead arbitrarily is still possible from the
 * status dropdown elsewhere in the detail view, but the stepper itself
 * models the common one-step-at-a-time path).
 */
export function WorkflowStepper({ currentStatus, onAdvance, disabled }: { currentStatus: string; onAdvance: (status: string) => void; disabled?: boolean }) {
  if (currentStatus === "cancelled") {
    return <p className="text-sm text-muted-foreground">This booking was cancelled.</p>;
  }

  const currentOrder = getBookingStage(currentStatus as never).order;

  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
      {WORKFLOW_STAGE_KEYS.map((key) => {
        const stage = BOOKING_STAGES.find((s) => s.key === key)!;
        const isDone = stage.order < currentOrder;
        const isCurrent = stage.order === currentOrder;
        const isNext = stage.order === currentOrder + 1;

        return (
          <button
            key={key}
            type="button"
            disabled={disabled || !isNext}
            onClick={() => isNext && onAdvance(key)}
            className={cn(
              "flex min-w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-md border px-2 py-2 text-center",
              isDone && "border-success/40 bg-success/10 text-success",
              isCurrent && "border-brand bg-accent text-brand",
              !isDone && !isCurrent && "border-border text-muted-foreground",
              isNext && !disabled && "cursor-pointer hover:border-brand",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">
              {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : stage.order}
            </span>
            <span className="text-[11px] font-medium leading-tight">{stage.label}</span>
          </button>
        );
      })}
    </div>
  );
}
