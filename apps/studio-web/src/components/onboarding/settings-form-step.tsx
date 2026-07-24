"use client";

import * as React from "react";
import { FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import type { OnboardingStepKey } from "@bcp/onboarding";
import { useOnboarding } from "../../lib/onboarding-context";
import { StepFrame } from "./step-frame";

export interface SimpleField {
  name: string;
  label: string;
  type?: "text" | "email" | "checkbox";
  required?: boolean;
  hint?: string;
  fullWidth?: boolean;
}

export interface SettingsFormStepProps {
  stepKey: OnboardingStepKey;
  fields: SimpleField[];
  /** Static values a step wants to send alongside the form fields (e.g. `{ registered: true }`). */
  extraValues?: Record<string, unknown>;
}

/**
 * Covers every onboarding step whose data has no dedicated model yet and
 * is backed by `StudioSetting` (business info, GST, bank details, UPI,
 * payment gateway) — one generic form renderer driven by a field list,
 * instead of five near-identical bespoke components. See
 * packages/onboarding/docs/onboarding.md § "Staged vs. live steps".
 */
export function SettingsFormStep({ stepKey, fields, extraValues }: SettingsFormStepProps) {
  const { saveSettingsStep, skipStep } = useOnboarding();
  const [values, setValues] = React.useState<Record<string, string | boolean>>({});

  function setValue(name: string, value: string | boolean) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  return (
    <StepFrame
      stepKey={stepKey}
      onSaveAndContinue={() => saveSettingsStep(stepKey, { ...values, ...extraValues })}
      onSkip={() => skipStep(stepKey)}
    >
      <ResponsiveFormLayout
        sections={[
          {
            id: stepKey,
            columns: 2,
            children: (
              <>
                {fields.map((field) => (
                  <FormField key={field.name} label={field.label} htmlFor={field.name} hint={field.hint} fullWidth={field.fullWidth} required={field.required}>
                    <Input
                      type={field.type === "checkbox" ? "checkbox" : field.type ?? "text"}
                      value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      required={field.required}
                    />
                  </FormField>
                ))}
              </>
            ),
          },
        ]}
      />
    </StepFrame>
  );
}
