"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { SERVICE_CATEGORIES } from "@bcp/catalog";
import { apiPost, apiPatch } from "../../lib/api-client";

export interface ServiceRecord {
  id: string;
  name: string;
  category: string;
  description: string | null;
  internalPrice: number;
  unit: string;
  isActive: boolean;
}

const UNIT_OPTIONS = [
  { value: "per_event", label: "Per event" }, { value: "per_hour", label: "Per hour" },
  { value: "per_day", label: "Per day" }, { value: "per_item", label: "Per item" },
];

export function ServiceFormDialog({ open, onOpenChange, service, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; service?: ServiceRecord | null; onSaved: () => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState(SERVICE_CATEGORIES[0]!.key);
  const [description, setDescription] = React.useState("");
  const [internalPrice, setInternalPrice] = React.useState("");
  const [unit, setUnit] = React.useState("per_event");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (service) {
      setName(service.name);
      setCategory(service.category as never);
      setDescription(service.description ?? "");
      setInternalPrice(String(service.internalPrice / 100));
      setUnit(service.unit);
    } else {
      setName(""); setCategory(SERVICE_CATEGORIES[0]!.key); setDescription(""); setInternalPrice(""); setUnit("per_event");
    }
    setError(null);
  }, [service, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = { name, category, description: description || undefined, internalPrice: Math.round(Number(internalPrice || 0) * 100), unit };
    const res = service ? await apiPatch(`/services/${service.id}`, payload) : await apiPost("/services", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not save this service");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={service ? "Edit service" : "New service"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "service",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="sf-name" required fullWidth><Input id="sf-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
                  <FormField label="Category" htmlFor="sf-category">
                    <Select id="sf-category" value={category} onChange={(e) => setCategory(e.target.value as never)} options={SERVICE_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))} />
                  </FormField>
                  <FormField label="Unit" htmlFor="sf-unit"><Select id="sf-unit" value={unit} onChange={(e) => setUnit(e.target.value)} options={UNIT_OPTIONS} /></FormField>
                  <FormField label="Internal price (₹)" htmlFor="sf-price" required hint="Your own cost/rate — never shown to customers directly.">
                    <Input id="sf-price" type="number" min="0" value={internalPrice} onChange={(e) => setInternalPrice(e.target.value)} required />
                  </FormField>
                  <FormField label="Description" htmlFor="sf-description" fullWidth><Textarea id="sf-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : service ? "Save changes" : "Add service"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
