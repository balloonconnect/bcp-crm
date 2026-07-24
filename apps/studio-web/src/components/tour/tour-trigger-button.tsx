"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@bcp/ui";
import { useTour } from "./tour-context";

export function TourTriggerButton() {
  const { start, hasCompletedTour } = useTour();

  return (
    <Button type="button" variant="outline" size="sm" onClick={start}>
      <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
      {hasCompletedTour ? "Restart Tour" : "Take the Tour"}
    </Button>
  );
}
