"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@bcp/ui";
import { useTour } from "./tour-context";
import { TOUR_STEPS } from "./tour-steps";

/**
 * The actual spotlight — finds the current step's real target element
 * on the page (by its `data-tour` attribute) and positions a tooltip
 * next to it, re-measuring on scroll/resize so it never drifts out of
 * place. If a step's target genuinely isn't on the page yet (the
 * route just changed and hasn't finished rendering), the tooltip
 * waits rather than pointing at nothing.
 */
export function TourOverlay() {
  const { isActive, stepIndex, currentStep, next, prev, skip } = useTour();
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(currentStep!.targetSelector);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    }

    measure();
    const interval = setInterval(measure, 200); // catches the target appearing shortly after a route change, without a more elaborate mutation-observer setup
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [currentStep]);

  if (!isActive || !currentStep) return null;

  const tooltipTop = targetRect ? targetRect.bottom + 12 : 100;
  const tooltipLeft = targetRect ? Math.min(targetRect.left, window.innerWidth - 340) : 24;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" />
      {targetRect && (
        <div
          className="absolute rounded-md ring-4 ring-brand transition-all"
          style={{ top: targetRect.top - 4, left: targetRect.left - 4, width: targetRect.width + 8, height: targetRect.height + 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)" }}
        />
      )}
      <div className="absolute w-80 rounded-lg border border-border bg-background p-4 shadow-xl" style={{ top: tooltipTop, left: tooltipLeft }}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-display text-base">{currentStep.title}</p>
          <button type="button" onClick={skip} aria-label="Close tour" className="text-muted-foreground"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">{currentStep.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{stepIndex + 1} of {TOUR_STEPS.length}</span>
          <div className="flex gap-2">
            {stepIndex > 0 && <Button type="button" size="sm" variant="outline" onClick={prev}>Back</Button>}
            <Button type="button" size="sm" onClick={next}>{stepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
