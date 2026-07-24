"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, StickyActionBar } from "@bcp/ui";
import { getStepDefinition, type OnboardingStepKey } from "@bcp/onboarding";

export interface StepFrameProps {
  stepKey: OnboardingStepKey;
  children: React.ReactNode;
  /** Called when "Save & continue" is pressed — throw to keep the user on this step with an error shown. */
  onSaveAndContinue?: () => Promise<void>;
  onSkip?: () => Promise<void>;
  saveLabel?: string;
  /** Hide the save button entirely for steps whose form has its own submit (e.g. team invitations sends multiple, one at a time). */
  hideSaveButton?: boolean;
}

/**
 * The shared chrome every step uses: title/description from the step
 * registry (@bcp/onboarding — one source of truth, not copy-pasted per
 * step), a `StickyActionBar` (mobile-friendly — stays reachable without
 * scrolling back up on a long form, per the design system's Phase 2
 * pattern) with "Skip this step" (only shown when the step is actually
 * skippable) and "Save & continue".
 */
export function StepFrame({ stepKey, children, onSaveAndContinue, onSkip, saveLabel = "Save & continue", hideSaveButton }: StepFrameProps) {
  const definition = getStepDefinition(stepKey);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave() {
    if (!onSaveAndContinue) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSaveAndContinue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    if (!onSkip) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSkip();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This step can't be skipped");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{definition.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{definition.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {children}

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <StickyActionBar aboveMobileNav={false}>
          {!definition.required && onSkip && (
            <Button type="button" variant="ghost" disabled={submitting} onClick={handleSkip}>
              Skip this step
            </Button>
          )}
          {!hideSaveButton && onSaveAndContinue && (
            <Button type="button" disabled={submitting} onClick={handleSave}>
              {submitting ? "Saving…" : saveLabel}
            </Button>
          )}
        </StickyActionBar>
      </CardContent>
    </Card>
  );
}
