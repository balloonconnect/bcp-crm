import { ONBOARDING_STEPS, type OnboardingStepKey } from "./steps";

export type SetupChecklistItemStatus = "done" | "skipped" | "pending";

export interface SetupChecklistItem {
  key: OnboardingStepKey;
  title: string;
  status: SetupChecklistItemStatus;
  required: boolean;
}

/**
 * A persistent, dashboard-friendly view of onboarding progress — distinct
 * from the wizard itself. A studio that finished required steps but
 * skipped optional ones (e.g. never connected WhatsApp) still sees a
 * "Finish setting up your studio" checklist on their dashboard with the
 * skipped items listed as outstanding, not silently forgotten.
 */
export function buildSetupChecklist(completedSteps: string[], skippedSteps: string[]): SetupChecklistItem[] {
  const completedSet = new Set(completedSteps);
  const skippedSet = new Set(skippedSteps);

  return ONBOARDING_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    required: step.required,
    status: completedSet.has(step.key) ? "done" : skippedSet.has(step.key) ? "skipped" : "pending",
  }));
}

/** Just the items still worth nudging someone to finish — done items are excluded. */
export function getOutstandingChecklistItems(completedSteps: string[], skippedSteps: string[]): SetupChecklistItem[] {
  return buildSetupChecklist(completedSteps, skippedSteps).filter((item) => item.status !== "done");
}
