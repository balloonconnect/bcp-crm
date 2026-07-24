"use client";

import * as React from "react";
import { FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import { brandColorsStepSchema } from "@bcp/onboarding";
import { apiPatch } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function BrandColorsStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [primaryColor, setPrimaryColor] = React.useState("#E8A33D");
  const [accentColor, setAccentColor] = React.useState("#2E2A26");

  async function handleSave() {
    const parsed = brandColorsStepSchema.parse({ primaryColor, accentColor });
    const res = await apiPatch("/branding/theme", parsed);
    if (!res.ok) throw new Error(res.error?.message ?? "Could not save your brand colours");
    await markStepDone("brand_colors");
  }

  return (
    <StepFrame stepKey="brand_colors" onSaveAndContinue={handleSave} onSkip={() => skipStep("brand_colors")}>
      <ResponsiveFormLayout
        sections={[
          {
            id: "brand-colors",
            columns: 2,
            children: (
              <>
                <FormField label="Primary colour" htmlFor="primary-color">
                  <Input id="primary-color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                </FormField>
                <FormField label="Accent colour" htmlFor="accent-color">
                  <Input id="accent-color" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                </FormField>
              </>
            ),
          },
        ]}
      />
    </StepFrame>
  );
}
