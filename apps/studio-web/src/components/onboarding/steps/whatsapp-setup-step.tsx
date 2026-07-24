"use client";

import * as React from "react";
import { FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import { whatsappSetupStepSchema } from "@bcp/onboarding";
import { apiPatch } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function WhatsappSetupStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [whatsappNumber, setWhatsappNumber] = React.useState("");
  const [whatsappDisplayName, setWhatsappDisplayName] = React.useState("");

  async function handleSave() {
    const parsed = whatsappSetupStepSchema.parse({ whatsappNumber, whatsappDisplayName });
    const res = await apiPatch("/branding/theme", parsed);
    if (!res.ok) throw new Error(res.error?.message ?? "Could not save your WhatsApp settings");
    await markStepDone("whatsapp_setup");
  }

  return (
    <StepFrame stepKey="whatsapp_setup" onSaveAndContinue={handleSave} onSkip={() => skipStep("whatsapp_setup")}>
      <ResponsiveFormLayout
        sections={[
          {
            id: "whatsapp-setup",
            columns: 2,
            children: (
              <>
                <FormField label="WhatsApp number" htmlFor="whatsapp-number" required hint="Include country code, e.g. +91">
                  <Input id="whatsapp-number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} required />
                </FormField>
                <FormField label="Display name" htmlFor="whatsapp-display-name" required>
                  <Input id="whatsapp-display-name" value={whatsappDisplayName} onChange={(e) => setWhatsappDisplayName(e.target.value)} required />
                </FormField>
              </>
            ),
          },
        ]}
      />
    </StepFrame>
  );
}
