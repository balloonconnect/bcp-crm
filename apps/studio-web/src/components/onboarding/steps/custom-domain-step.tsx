"use client";

import * as React from "react";
import { FormField, Input, Select } from "@bcp/ui";
import { apiPost } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function CustomDomainStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [domain, setDomain] = React.useState("");
  const [purpose, setPurpose] = React.useState("studio_crm");

  async function handleSave() {
    if (!domain.trim()) throw new Error("Enter a domain, or skip this step for now.");
    const res = await apiPost("/domains", { domain, purpose });
    if (!res.ok) throw new Error(res.error?.message ?? "Could not add this domain");
    await markStepDone("custom_domain");
  }

  return (
    <StepFrame stepKey="custom_domain" onSaveAndContinue={handleSave} onSkip={() => skipStep("custom_domain")}>
      <FormField label="Domain" htmlFor="custom-domain" hint="You'll get DNS records to add once this is saved — full setup happens later from Settings → Domains." fullWidth>
        <Input id="custom-domain" placeholder="studio.yourbrand.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
      </FormField>
      <FormField label="What is this domain for?" htmlFor="custom-domain-purpose">
        <Select
          id="custom-domain-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          options={[
            { value: "studio_crm", label: "Studio CRM" },
            { value: "client_portal", label: "Client portal" },
            { value: "gallery", label: "Gallery" },
            { value: "enquiry_form", label: "Enquiry form" },
            { value: "root_website", label: "Website" },
          ]}
        />
      </FormField>
    </StepFrame>
  );
}
