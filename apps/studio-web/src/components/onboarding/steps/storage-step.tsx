"use client";

import * as React from "react";
import { apiGet } from "../../../lib/api-client";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

interface UsageSnapshot {
  dimension: string;
  current: number | null;
  limit: number | null;
  percentUsed: number;
  level: "ok" | "warning" | "critical" | "exceeded";
}

export function StorageStep() {
  const { markStepDone } = useOnboarding();
  const [usage, setUsage] = React.useState<UsageSnapshot | null>(null);

  React.useEffect(() => {
    void apiGet<{ usage: UsageSnapshot[] }>("/billing/usage").then((res) => {
      if (res.ok && res.data) {
        setUsage(res.data.usage.find((u) => u.dimension === "maxStorageGb") ?? null);
      }
    });
  }, []);

  return (
    <StepFrame stepKey="storage" onSaveAndContinue={() => markStepDone("storage")} saveLabel="Continue" hideSaveButton={false}>
      {usage ? (
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">Storage used</p>
          <p className="text-2xl font-semibold">
            {usage.current ?? 0} GB {usage.limit ? <span className="text-base font-normal text-muted-foreground">of {usage.limit} GB</span> : <span className="text-base font-normal text-muted-foreground">— unlimited on your plan</span>}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading your plan&apos;s storage allowance…</p>
      )}
      <p className="text-sm text-muted-foreground">
        Galleries, albums, and deliverables all count against this. You can upgrade your plan any time from Billing if you need more room.
      </p>
    </StepFrame>
  );
}
