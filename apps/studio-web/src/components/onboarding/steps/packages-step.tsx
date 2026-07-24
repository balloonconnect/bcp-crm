"use client";

import * as React from "react";
import { Trash2, Plus, Sparkles } from "lucide-react";
import { Button, FormField, Input } from "@bcp/ui";
import { packagesStepSchema, SAMPLE_PACKAGES } from "@bcp/onboarding";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

interface DraftPackage {
  id: string;
  name: string;
  description: string;
  price: string;
}

function emptyRow(): DraftPackage {
  return { id: crypto.randomUUID(), name: "", description: "", price: "" };
}

export function PackagesStep() {
  const { saveSettingsStep, skipStep } = useOnboarding();
  const [rows, setRows] = React.useState<DraftPackage[]>([emptyRow()]);

  function updateRow(id: string, patch: Partial<DraftPackage>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function useSamplePackages() {
    setRows(SAMPLE_PACKAGES.map((p) => ({ id: crypto.randomUUID(), name: p.name, description: p.description, price: String(p.price / 100) })));
  }

  async function handleSave() {
    const packages = rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({ name: r.name, description: r.description || undefined, price: r.price ? Math.round(Number(r.price) * 100) : 0, serviceNames: [] }));
    const parsed = packagesStepSchema.parse({ packages });
    await saveSettingsStep("packages", parsed);
  }

  return (
    <StepFrame stepKey="packages" onSaveAndContinue={handleSave} onSkip={() => skipStep("packages")}>
      <Button type="button" variant="outline" size="sm" onClick={useSamplePackages} className="self-start">
        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
        Use sample packages
      </Button>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end sm:border-0 sm:p-0">
            <FormField label="Package name" htmlFor={`package-name-${row.id}`} fullWidth>
              <Input id={`package-name-${row.id}`} value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
            </FormField>
            <FormField label="Price (₹)" htmlFor={`package-price-${row.id}`}>
              <Input id={`package-price-${row.id}`} type="number" min="0" value={row.price} onChange={(e) => updateRow(row.id, { price: e.target.value })} />
            </FormField>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove package" onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, emptyRow()])} className="self-start">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add a package
        </Button>
      </div>
    </StepFrame>
  );
}
