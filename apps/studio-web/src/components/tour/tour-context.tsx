"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { TOUR_STEPS } from "./tour-steps";

const TOUR_COMPLETED_KEY = "bcp_tour_completed";

interface TourContextValue {
  isActive: boolean;
  stepIndex: number;
  currentStep: (typeof TOUR_STEPS)[number] | null;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  hasCompletedTour: boolean;
}

const TourContext = React.createContext<TourContextValue | null>(null);

/**
 * Owns the tour's own state (active/inactive, current step) and
 * navigation — advancing to a step whose target lives on a different
 * page pushes a real route change first, so the tour genuinely walks
 * a new studio owner through the app rather than only pointing at
 * whatever happens to already be on screen. Completion is remembered
 * per browser (not shown again automatically), but "Start Tour" is
 * always available again from Settings for anyone who wants a
 * refresher.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isActive, setIsActive] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [hasCompletedTour, setHasCompletedTour] = React.useState(true); // assume completed until checked, so the tour never flashes on for a returning user

  React.useEffect(() => {
    setHasCompletedTour(window.localStorage.getItem(TOUR_COMPLETED_KEY) === "true");
  }, []);

  const currentStep = isActive ? TOUR_STEPS[stepIndex] ?? null : null;

  React.useEffect(() => {
    if (currentStep && currentStep.route !== pathname) {
      router.push(currentStep.route as never);
    }
  }, [currentStep, pathname, router]);

  function start() {
    setStepIndex(0);
    setIsActive(true);
  }

  function finish() {
    setIsActive(false);
    window.localStorage.setItem(TOUR_COMPLETED_KEY, "true");
    setHasCompletedTour(true);
  }

  function next() {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function prev() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function skip() {
    finish();
  }

  return (
    <TourContext.Provider value={{ isActive, stepIndex, currentStep, start, next, prev, skip, hasCompletedTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = React.useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
