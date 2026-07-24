"use client";

import * as React from "react";
import { FormField, Input, ResponsiveFormLayout } from "@bcp/ui";
import { branchStepSchema } from "@bcp/onboarding";
import { apiPost } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function BranchStep() {
  const { markStepDone } = useOnboarding();
  const [name, setName] = React.useState("Main Branch");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [phone, setPhone] = React.useState("");

  async function handleSave() {
    const parsed = branchStepSchema.parse({ name, city: city || undefined, state: state || undefined, phone: phone || undefined });
    const res = await apiPost("/branches", parsed);
    if (!res.ok) throw new Error(res.error?.message ?? "Could not save this branch");
    await markStepDone("branch");
  }

  return (
    <StepFrame stepKey="branch" onSaveAndContinue={handleSave}>
      <ResponsiveFormLayout
        sections={[
          {
            id: "branch",
            columns: 2,
            children: (
              <>
                <FormField label="Branch name" htmlFor="branch-name" required fullWidth>
                  <Input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </FormField>
                <FormField label="City" htmlFor="branch-city">
                  <Input id="branch-city" value={city} onChange={(e) => setCity(e.target.value)} />
                </FormField>
                <FormField label="State" htmlFor="branch-state">
                  <Input id="branch-state" value={state} onChange={(e) => setState(e.target.value)} />
                </FormField>
                <FormField label="Phone" htmlFor="branch-phone">
                  <Input id="branch-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </FormField>
              </>
            ),
          },
        ]}
      />
    </StepFrame>
  );
}
