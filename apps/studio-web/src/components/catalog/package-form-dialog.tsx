"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Textarea, Button } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../lib/api-client";
import type { ServiceRecord } from "./service-form-dialog";

interface PackageDetail {
  id: string;
  name: string;
  eventType: string;
  description: string | null;
  customerFacingTotal: number;
  itemLevelPricingEnabled: boolean;
  durationLabel: string | null;
  teamRequirement: string | null;
  deliverables: string[];
  taxRatePercent: number;
  taxInclusive: boolean;
  discountAllowed: boolean;
  maxDiscountPercent: number | null;
  termsText: string | null;
  packageServices: { serviceId: string; quantity: number; service: { name: string } }[];
  addOns: { name: string; price: number; description?: string }[];
  paymentSchedule: { label: string; percentage: number; trigger: string }[];
}

export function PackageFormDialog({ open, onOpenChange, pkg, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; pkg?: PackageDetail | null; onSaved: () => void }) {
  const [services, setServices] = React.useState<ServiceRecord[]>([]);
  const [name, setName] = React.useState("");
  const [eventType, setEventType] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [total, setTotal] = React.useState("");
  const [itemLevelPricingEnabled, setItemLevelPricingEnabled] = React.useState(false);
  const [durationLabel, setDurationLabel] = React.useState("");
  const [teamRequirement, setTeamRequirement] = React.useState("");
  const [deliverablesText, setDeliverablesText] = React.useState("");
  const [taxRatePercent, setTaxRatePercent] = React.useState("18");
  const [discountAllowed, setDiscountAllowed] = React.useState(false);
  const [maxDiscountPercent, setMaxDiscountPercent] = React.useState("");
  const [termsText, setTermsText] = React.useState("");
  const [selectedServices, setSelectedServices] = React.useState<Record<string, number>>({});
  const [addOns, setAddOns] = React.useState<{ name: string; price: string }[]>([]);
  const [schedule, setSchedule] = React.useState<{ label: string; percentage: string }[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void apiGet<ServiceRecord[]>("/services").then((res) => res.ok && setServices(res.data ?? []));
  }, []);

  React.useEffect(() => {
    if (pkg) {
      setName(pkg.name); setEventType(pkg.eventType); setDescription(pkg.description ?? "");
      setTotal(String(pkg.customerFacingTotal / 100)); setItemLevelPricingEnabled(pkg.itemLevelPricingEnabled);
      setDurationLabel(pkg.durationLabel ?? ""); setTeamRequirement(pkg.teamRequirement ?? "");
      setDeliverablesText(pkg.deliverables.join(", ")); setTaxRatePercent(String(pkg.taxRatePercent));
      setDiscountAllowed(pkg.discountAllowed); setMaxDiscountPercent(pkg.maxDiscountPercent ? String(pkg.maxDiscountPercent) : "");
      setTermsText(pkg.termsText ?? "");
      setSelectedServices(Object.fromEntries(pkg.packageServices.map((ps) => [ps.serviceId, ps.quantity])));
      setAddOns(pkg.addOns.map((a) => ({ name: a.name, price: String(a.price / 100) })));
      setSchedule(pkg.paymentSchedule.map((p) => ({ label: p.label, percentage: String(p.percentage) })));
    } else {
      setName(""); setEventType(""); setDescription(""); setTotal(""); setItemLevelPricingEnabled(false);
      setDurationLabel(""); setTeamRequirement(""); setDeliverablesText(""); setTaxRatePercent("18");
      setDiscountAllowed(false); setMaxDiscountPercent(""); setTermsText("");
      setSelectedServices({}); setAddOns([]); setSchedule([]);
    }
    setError(null);
  }, [pkg, open]);

  function toggleService(serviceId: string) {
    setSelectedServices((prev) => {
      const next = { ...prev };
      if (serviceId in next) delete next[serviceId];
      else next[serviceId] = 1;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name, eventType,
      description: description || undefined,
      customerFacingTotal: Math.round(Number(total || 0) * 100),
      itemLevelPricingEnabled,
      durationLabel: durationLabel || undefined,
      teamRequirement: teamRequirement || undefined,
      deliverables: deliverablesText.split(",").map((d) => d.trim()).filter(Boolean),
      taxRatePercent: Number(taxRatePercent || 0),
      discountAllowed,
      maxDiscountPercent: maxDiscountPercent ? Number(maxDiscountPercent) : undefined,
      termsText: termsText || undefined,
      services: Object.entries(selectedServices).map(([serviceId, quantity]) => ({ serviceId, quantity })),
      addOns: addOns.filter((a) => a.name.trim()).map((a) => ({ name: a.name, price: Math.round(Number(a.price || 0) * 100) })),
      paymentSchedule: schedule.filter((s) => s.label.trim()).map((s) => ({ label: s.label, percentage: Number(s.percentage || 0) })),
    };

    const res = pkg ? await apiPatch(`/packages/${pkg.id}`, payload) : await apiPost("/packages", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not save this package");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={pkg ? "Edit package" : "New package"} className="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <ResponsiveFormLayout
          sections={[
            {
              id: "basics",
              title: "Basics",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="pf-name" required fullWidth><Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
                  <FormField label="Event type" htmlFor="pf-event-type" required><Input id="pf-event-type" value={eventType} onChange={(e) => setEventType(e.target.value)} required /></FormField>
                  <FormField label="Customer-facing total (₹)" htmlFor="pf-total" required hint="What the customer is quoted — independent of summed service costs."><Input id="pf-total" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} required /></FormField>
                  <FormField label="Duration" htmlFor="pf-duration"><Input id="pf-duration" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="Full day" /></FormField>
                  <FormField label="Team requirement" htmlFor="pf-team"><Input id="pf-team" value={teamRequirement} onChange={(e) => setTeamRequirement(e.target.value)} placeholder="2 photographers, 1 videographer" /></FormField>
                  <FormField label="Description" htmlFor="pf-description" fullWidth><Textarea id="pf-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                  <FormField label="Deliverables" htmlFor="pf-deliverables" hint="Comma-separated" fullWidth><Input id="pf-deliverables" value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "services",
              title: "Included services",
              columns: 1,
              children: (
                <div className="flex flex-col gap-2">
                  {services.map((service) => (
                    <label key={service.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={service.id in selectedServices} onChange={() => toggleService(service.id)} />
                      {service.name}
                      {service.id in selectedServices && (
                        <Input
                          type="number"
                          min="1"
                          value={selectedServices[service.id]}
                          onChange={(e) => setSelectedServices((prev) => ({ ...prev, [service.id]: Number(e.target.value) || 1 }))}
                          className="ml-auto w-20"
                        />
                      )}
                    </label>
                  ))}
                  {services.length === 0 && <p className="text-sm text-muted-foreground">No services in your catalog yet — add some from the Services page first.</p>}
                </div>
              ),
            },
            {
              id: "pricing-rule",
              title: "Pricing visibility",
              columns: 1,
              children: (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5" checked={itemLevelPricingEnabled} onChange={(e) => setItemLevelPricingEnabled(e.target.checked)} />
                  <span>
                    Show individual service prices to the customer
                    <span className="mt-0.5 block text-xs text-muted-foreground">Off by default — customers see what&apos;s included, not each service&apos;s internal price, unless you turn this on.</span>
                  </span>
                </label>
              ),
            },
            {
              id: "addons",
              title: "Add-ons",
              columns: 1,
              children: (
                <div className="flex flex-col gap-2">
                  {addOns.map((addOn, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="Name" value={addOn.name} onChange={(e) => setAddOns((a) => a.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Input type="number" placeholder="Price (₹)" value={addOn.price} onChange={(e) => setAddOns((a) => a.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="w-32" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setAddOns((a) => a.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setAddOns((a) => [...a, { name: "", price: "" }])}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Add add-on
                  </Button>
                </div>
              ),
            },
            {
              id: "schedule",
              title: "Payment schedule",
              columns: 1,
              children: (
                <div className="flex flex-col gap-2">
                  {schedule.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="Label" value={item.label} onChange={(e) => setSchedule((s) => s.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <Input type="number" placeholder="%" value={item.percentage} onChange={(e) => setSchedule((s) => s.map((x, j) => (j === i ? { ...x, percentage: e.target.value } : x)))} className="w-24" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSchedule((s) => s.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setSchedule((s) => [...s, { label: "", percentage: "" }])}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Add milestone
                  </Button>
                  <p className="text-xs text-muted-foreground">Percentages should add up to 100.</p>
                </div>
              ),
            },
            {
              id: "tax-terms",
              title: "Tax, discounts & terms",
              columns: 2,
              children: (
                <>
                  <FormField label="Tax rate (%)" htmlFor="pf-tax"><Input id="pf-tax" type="number" min="0" value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} /></FormField>
                  <FormField label="Max discount (%)" htmlFor="pf-max-discount"><Input id="pf-max-discount" type="number" min="0" value={maxDiscountPercent} onChange={(e) => setMaxDiscountPercent(e.target.value)} /></FormField>
                  <label className="col-span-full flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={discountAllowed} onChange={(e) => setDiscountAllowed(e.target.checked)} />
                    Allow discounting this package
                  </label>
                  <FormField label="Terms" htmlFor="pf-terms" fullWidth><Textarea id="pf-terms" rows={2} value={termsText} onChange={(e) => setTermsText(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : pkg ? "Save changes" : "Create package"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
