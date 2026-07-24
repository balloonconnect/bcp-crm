"use client";

import * as React from "react";
import { FormField, Select } from "@bcp/ui";
import { paymentGatewayStepSchema } from "@bcp/onboarding";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

export function PaymentGatewayStep() {
  const { saveSettingsStep, skipStep } = useOnboarding();
  const [provider, setProvider] = React.useState<"razorpay" | "stripe">("razorpay");

  async function handleSave() {
    // Records the studio's preferred gateway; wiring up real OAuth/API
    // keys with Razorpay or Stripe is a dedicated integration step done
    // later from Settings, not something this wizard can complete on its
    // own.
    const parsed = paymentGatewayStepSchema.parse({ provider, connected: false });
    await saveSettingsStep("payment_gateway", parsed);
  }

  return (
    <StepFrame stepKey="payment_gateway" onSaveAndContinue={handleSave} onSkip={() => skipStep("payment_gateway")}>
      <FormField label="Payment gateway" htmlFor="payment-gateway-provider" hint="You'll connect your account for real from Settings → Payments after setup.">
        <Select
          id="payment-gateway-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as "razorpay" | "stripe")}
          options={[
            { value: "razorpay", label: "Razorpay" },
            { value: "stripe", label: "Stripe" },
          ]}
        />
      </FormField>
    </StepFrame>
  );
}
