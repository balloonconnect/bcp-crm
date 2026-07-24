"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button, FormField, Textarea } from "@bcp/ui";
import { customerImportStepSchema, SAMPLE_CUSTOMERS } from "@bcp/onboarding";
import { apiPost } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

function parsePastedRows(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, email, phone] = line.split(",").map((cell) => cell.trim());
      return { name, email: email || undefined, phone: phone || undefined };
    })
    .filter((row) => row.name);
}

export function CustomerImportStep() {
  const { markStepDone, skipStep } = useOnboarding();
  const [text, setText] = React.useState("");

  function fillSample() {
    setText(SAMPLE_CUSTOMERS.map((c) => `${c.name}, ${c.email}, ${c.phone}`).join("\n"));
  }

  async function handleSave() {
    const customers = parsePastedRows(text);
    if (customers.length === 0) throw new Error("Paste at least one customer, or skip this step for now.");
    const parsed = customerImportStepSchema.parse({ customers });
    const res = await apiPost("/customers/import", parsed);
    if (!res.ok) throw new Error(res.error?.message ?? "Could not import your customers");
    await markStepDone("customer_import");
  }

  return (
    <StepFrame stepKey="customer_import" onSaveAndContinue={handleSave} onSkip={() => skipStep("customer_import")} saveLabel="Import & continue">
      <Button type="button" variant="outline" size="sm" onClick={fillSample} className="self-start">
        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
        Fill with sample customers
      </Button>
      <FormField label="Paste your customer list" htmlFor="customer-import-text" hint="One per line: Name, email, phone" fullWidth>
        <Textarea id="customer-import-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ananya & Rohit, ananya@example.com, +919800000001" />
      </FormField>
    </StepFrame>
  );
}
