import { ONBOARDING_STEPS, TOTAL_STEPS, REQUIRED_STEP_KEYS, getStepDefinition, type OnboardingStepKey } from "./steps";

export interface OnboardingProgress {
  totalSteps: number;
  completedCount: number;
  skippedCount: number;
  percentComplete: number;
  nextStep: OnboardingStepKey | null;
  isComplete: boolean;
  /** Required steps not yet completed (skip doesn't count for required ones — see canSkipStep). */
  outstandingRequiredSteps: OnboardingStepKey[];
}

/**
 * The single function both the wizard's progress bar and the resume flow
 * use to answer "where is this studio in setup." A step counts toward
 * completion whether it was actually completed or (for optional steps)
 * skipped — the wizard shouldn't stay stuck at 60% forever just because
 * someone skipped 8 optional steps they don't need.
 */
export function computeProgress(completedSteps: string[], skippedSteps: string[]): OnboardingProgress {
  const completedSet = new Set(completedSteps);
  const skippedSet = new Set(skippedSteps);
  const accountedFor = new Set([...completedSet, ...skippedSet]);

  const nextStepDef = ONBOARDING_STEPS.find((s) => !accountedFor.has(s.key));
  const outstandingRequiredSteps = REQUIRED_STEP_KEYS.filter((key) => !completedSet.has(key));

  return {
    totalSteps: TOTAL_STEPS,
    completedCount: completedSet.size,
    skippedCount: skippedSet.size,
    percentComplete: Math.round((accountedFor.size / TOTAL_STEPS) * 100),
    nextStep: nextStepDef?.key ?? null,
    isComplete: outstandingRequiredSteps.length === 0 && accountedFor.size >= TOTAL_STEPS,
    outstandingRequiredSteps,
  };
}

export function canSkipStep(stepKey: OnboardingStepKey): boolean {
  return !getStepDefinition(stepKey).required;
}

export class RequiredStepCannotBeSkippedError extends Error {
  constructor(stepKey: OnboardingStepKey) {
    super(`"${stepKey}" is a required step and cannot be skipped.`);
    this.name = "RequiredStepCannotBeSkippedError";
  }
}

export function assertCanSkipStep(stepKey: OnboardingStepKey): void {
  if (!canSkipStep(stepKey)) {
    throw new RequiredStepCannotBeSkippedError(stepKey);
  }
}

/**
 * The wizard lets a person jump to *any* step at any time (edit an
 * earlier answer, peek ahead) — nothing here gates step-to-step
 * navigation. What's gated is *completion*: `final_review` (and
 * completeOnboarding) should only be reachable once every required step
 * is done, which `computeProgress().outstandingRequiredSteps` answers.
 */
