"use client";

import { OnboardingProvider } from "../../lib/onboarding-context";
import { WizardShell } from "../../components/onboarding/wizard-shell";
import { GuidedTour } from "../../components/onboarding/guided-tour";
import { StepRouter } from "../../components/onboarding/step-router";

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <GuidedTour />
      <WizardShell>
        <StepRouter />
      </WizardShell>
    </OnboardingProvider>
  );
}
