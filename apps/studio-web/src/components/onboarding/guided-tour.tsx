"use client";

import * as React from "react";
import { Button, ResponsiveDialog } from "@bcp/ui";

const TOUR_SEEN_KEY = "bcp_onboarding_tour_seen";

interface TourSlide {
  title: string;
  description: string;
}

const SLIDES: TourSlide[] = [
  {
    title: "Welcome to BCP Studio OS",
    description: "This short setup walks you through getting your studio ready — branding, your team, pricing, and more. It only takes a few minutes for the essentials.",
  },
  {
    title: "Only 5 steps are required",
    description: "Owner account, studio name, your first branch, a subscription, and a final review. Everything else — logo, GST details, WhatsApp, domains — you can skip and come back to any time.",
  },
  {
    title: "Save as you go",
    description: "Every step saves the moment you continue. Close this tab and come back later — your progress (and this exact step) will be waiting for you.",
  },
  {
    title: "Try it with sample data",
    description: "On the final step, you can add a few sample services, packages, and customers so you can click around before entering anything real.",
  },
];

/**
 * A dismissible 4-slide welcome tour, shown once per browser (tracked in
 * `localStorage`, not tied to the onboarding session — someone starting
 * a second studio later shouldn't see it again). Built as plain slides
 * in a `ResponsiveDialog` rather than page-anchored spotlight tooltips:
 * the wizard's layout is still forming at this point (nothing to point
 * at yet on the very first step), so an upfront overview serves better
 * than a mid-form interruption.
 */
export function GuidedTour() {
  const [open, setOpen] = React.useState(false);
  const [slideIndex, setSlideIndex] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(TOUR_SEEN_KEY)) setOpen(true);
  }, []);

  function dismiss() {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
    setOpen(false);
  }

  const slide = (SLIDES[slideIndex] ?? SLIDES[0])!;
  const isLast = slideIndex === SLIDES.length - 1;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      title={slide.title}
      description={slide.description}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <span key={i} aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${i === slideIndex ? "bg-brand" : "bg-muted"}`} />
            ))}
            <Button
              type="button"
              size="sm"
              onClick={() => (isLast ? dismiss() : setSlideIndex((i) => i + 1))}
            >
              {isLast ? "Get started" : "Next"}
            </Button>
          </div>
        </div>
      }
    >
      <span className="sr-only">Slide {slideIndex + 1} of {SLIDES.length}</span>
    </ResponsiveDialog>
  );
}
