"use client";

import * as React from "react";
import { Trash2, Plus, Sparkles } from "lucide-react";
import { Button, FormField, Input } from "@bcp/ui";
import { servicesStepSchema, SAMPLE_SERVICES } from "@bcp/onboarding";
import { useOnboarding } from "../../../lib/onboarding-context";
import { StepFrame } from "../step-frame";

interface DraftService {
  id: string;
  name: string;
  description: string;
  basePrice: string;
}

function emptyRow(): DraftService {
  return { id: crypto.randomUUID(), name: "", description: "", basePrice: "" };
}

export function ServicesStep() {
  const { saveSettingsStep, skipStep } = useOnboarding();
  const [rows, setRows] = React.useState<DraftService[]>([emptyRow()]);

  function updateRow(id: string, patch: Partial<DraftService>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function useSampleServices() {
    setRows(SAMPLE_SERVICES.map((s) => ({ id: crypto.randomUUID(), name: s.name, description: s.description, basePrice: String(s.basePrice / 100) })));
  }

  async function handleSave() {
    const services = rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({ name: r.name, description: r.description || undefined, basePrice: r.basePrice ? Math.round(Number(r.basePrice) * 100) : undefined }));
    const parsed = servicesStepSchema.parse({ services });
    await saveSettingsStep("services", parsed);
  }

  return (
    <StepFrame stepKey="services" onSaveAndContinue={handleSave} onSkip={() => skipStep("services")}>
      <Button type="button" variant="outline" size="sm" onClick={useSampleServices} className="self-start">
        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
        Use sample services
      </Button>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end sm:border-0 sm:p-0">
            <FormField label="Service name" htmlFor={`service-name-${row.id}`} fullWidth>
              <Input id={`service-name-${row.id}`} value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
            </FormField>
            <FormField label="Price (₹)" htmlFor={`service-price-${row.id}`}>
              <Input id={`service-price-${row.id}`} type="number" min="0" value={row.basePrice} onChange={(e) => updateRow(row.id, { basePrice: e.target.value })} />
            </FormField>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove service" onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, emptyRow()])} className="self-start">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add a service
        </Button>
      </div>
    </StepFrame>
  );
}
