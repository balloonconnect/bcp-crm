"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@bcp/ui";
import { PLAN_DEFINITIONS, PLAN_KEYS, type PlanKey } from "@bcp/billing";
import { subscriptionStepSchema } from "@bcp/onboarding";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function SubscriptionStep() {
  const { saveSettingsStep } = useOnboarding();
  const [selected, setSelected] = React.useState<PlanKey>("starter");

  async function handleSave() {
    // Records the studio's chosen plan as a preference for platform-admin
    // / billing to act on — the *live* Subscription row was already
    // created on the Starter trial during provisioning (see
    // apps/api/src/services/onboarding.service.ts). Actually changing
    // plans mid-trial is a billing action with payment implications, so
    // it isn't triggered directly from here.
    const parsed = subscriptionStepSchema.parse({ planKey: selected, billingCycle: "yearly" });
    await saveSettingsStep("subscription", parsed);
  }

  return (
    <StepFrame stepKey="subscription" onSaveAndContinue={handleSave} saveLabel="Confirm plan & continue">
      <p className="text-sm text-muted-foreground">
        You&apos;re on a 14-day trial of the Starter plan already — pick the plan you&apos;d like once your trial ends, or keep Starter.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLAN_KEYS.map((key) => {
          const plan = PLAN_DEFINITIONS[key];
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-touch-target flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                isSelected ? "border-brand bg-accent" : "border-border hover:bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{plan.name}</span>
                {isSelected && <CheckCircle2 className="h-5 w-5 text-brand" aria-hidden="true" />}
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="text-lg font-semibold">
                {plan.priceMonthly === 0 ? "Custom pricing" : `${formatRupees(plan.priceMonthly)}/mo`}
              </p>
            </button>
          );
        })}
      </div>
    </StepFrame>
  );
}
