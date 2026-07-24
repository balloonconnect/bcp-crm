"use client";

import * as React from "react";
import { FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import { emailSetupStepSchema } from "@bcp/onboarding";
import { apiPatch } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function EmailSetupStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [emailFromName, setEmailFromName] = React.useState("");
  const [emailFromAddress, setEmailFromAddress] = React.useState("");

  async function handleSave() {
    const parsed = emailSetupStepSchema.parse({ emailFromName, emailFromAddress });
    const res = await apiPatch("/branding/theme", parsed);
    if (!res.ok) throw new Error(res.error?.message ?? "Could not save your email settings");
    await markStepDone("email_setup");
  }

  return (
    <StepFrame stepKey="email_setup" onSaveAndContinue={handleSave} onSkip={() => skipStep("email_setup")}>
      <ResponsiveFormLayout
        sections={[
          {
            id: "email-setup",
            columns: 2,
            children: (
              <>
                <FormField label="From name" htmlFor="email-from-name" required>
                  <Input id="email-from-name" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} required />
                </FormField>
                <FormField label="From address" htmlFor="email-from-address" required>
                  <Input id="email-from-address" type="email" value={emailFromAddress} onChange={(e) => setEmailFromAddress(e.target.value)} required />
                </FormField>
              </>
            ),
          },
        ]}
      />
    </StepFrame>
  );
}
