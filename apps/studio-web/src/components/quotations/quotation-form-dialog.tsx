"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Option { id: string; label: string }
interface PackageSummary { id: string; name: string; itemLevelPricingEnabled: boolean }

export function QuotationFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [clients, setClients] = React.useState<Option[]>([]);
  const [leads, setLeads] = React.useState<Option[]>([]);
  const [events, setEvents] = React.useState<Option[]>([]);
  const [packages, setPackages] = React.useState<PackageSummary[]>([]);

  const [clientId, setClientId] = React.useState("");
  const [leadId, setLeadId] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [packageId, setPackageId] = React.useState("");
  const [lineItems, setLineItems] = React.useState<{ name: string; unitPrice: string; quantity: string }[]>([]);
  const [discountType, setDiscountType] = React.useState("");
  const [discountValue, setDiscountValue] = React.useState("");
  const [gstRatePercent, setGstRatePercent] = React.useState("18");
  const [itemLevelPricingEnabled, setItemLevelPricingEnabled] = React.useState(false);
  const [termsText, setTermsText] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [schedule, setSchedule] = React.useState<{ label: string; percentage: string }[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    void apiGet<{ id: string; name: string }[]>("/customers").then((res) => res.ok && setClients((res.data ?? []).map((c) => ({ id: c.id, label: c.name }))));
    void apiGet<{ id: string; name: string }[]>("/leads").then((res) => res.ok && setLeads((res.data ?? []).map((l) => ({ id: l.id, label: l.name }))));
    void apiGet<{ id: string; title: string }[]>("/events").then((res) => res.ok && setEvents((res.data ?? []).map((e) => ({ id: e.id, label: e.title }))));
    void apiGet<PackageSummary[]>("/packages").then((res) => res.ok && setPackages(res.data ?? []));
  }, [open]);

  React.useEffect(() => {
    if (!packageId) return;
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) setItemLevelPricingEnabled(pkg.itemLevelPricingEnabled);
  }, [packageId, packages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      clientId: clientId || undefined,
      leadId: leadId || undefined,
      eventId: eventId || undefined,
      packageId: packageId || undefined,
      lineItems: packageId
        ? undefined
        : lineItems.filter((i) => i.name.trim()).map((i) => ({ name: i.name, unitPrice: Math.round(Number(i.unitPrice || 0) * 100), quantity: Number(i.quantity || 1) })),
      discountType: discountType || undefined,
      discountValue: discountValue ? Number(discountValue) : undefined,
      gstRatePercent: Number(gstRatePercent || 0),
      itemLevelPricingEnabled,
      termsText: termsText || undefined,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      paymentSchedule: schedule.filter((s) => s.label.trim()).map((s) => ({ label: s.label, percentage: Number(s.percentage || 0) })),
    };

    const res = await apiPost("/quotations", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not create this quotation");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New quotation" className="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <ResponsiveFormLayout
          sections={[
            {
              id: "who",
              title: "Who's this for",
              columns: 2,
              children: (
                <>
                  <FormField label="Client" htmlFor="qf-client"><Select id="qf-client" value={clientId} onChange={(e) => setClientId(e.target.value)} options={[{ value: "", label: "None" }, ...clients.map((c) => ({ value: c.id, label: c.label }))]} /></FormField>
                  <FormField label="Lead" htmlFor="qf-lead"><Select id="qf-lead" value={leadId} onChange={(e) => setLeadId(e.target.value)} options={[{ value: "", label: "None" }, ...leads.map((l) => ({ value: l.id, label: l.label }))]} /></FormField>
                  <FormField label="Event" htmlFor="qf-event"><Select id="qf-event" value={eventId} onChange={(e) => setEventId(e.target.value)} options={[{ value: "", label: "None" }, ...events.map((e) => ({ value: e.id, label: e.label }))]} /></FormField>
                  <FormField label="Package" htmlFor="qf-package" hint="Building from a package snapshots its services automatically."><Select id="qf-package" value={packageId} onChange={(e) => setPackageId(e.target.value)} options={[{ value: "", label: "Build manually" }, ...packages.map((p) => ({ value: p.id, label: p.name }))]} /></FormField>
                </>
              ),
            },
            ...(packageId
              ? []
              : [
                  {
                    id: "lineitems",
                    title: "Line items",
                    columns: 1 as const,
                    children: (
                      <div className="flex flex-col gap-2">
                        {lineItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input placeholder="Name" value={item.name} onChange={(e) => setLineItems((li) => li.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                            <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => setLineItems((li) => li.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} className="w-20" />
                            <Input type="number" placeholder="Price (₹)" value={item.unitPrice} onChange={(e) => setLineItems((li) => li.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} className="w-32" />
                            <Button type="button" variant="ghost" size="icon" onClick={() => setLineItems((li) => li.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setLineItems((li) => [...li, { name: "", unitPrice: "", quantity: "1" }])}>
                          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          Add line item
                        </Button>
                      </div>
                    ),
                  },
                ]),
            {
              id: "pricing",
              title: "Discount, tax & pricing visibility",
              columns: 2,
              children: (
                <>
                  <FormField label="Discount type" htmlFor="qf-discount-type"><Select id="qf-discount-type" value={discountType} onChange={(e) => setDiscountType(e.target.value)} options={[{ value: "", label: "None" }, { value: "percentage", label: "Percentage" }, { value: "fixed_amount", label: "Fixed amount" }]} /></FormField>
                  <FormField label="Discount value" htmlFor="qf-discount-value"><Input id="qf-discount-value" type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} /></FormField>
                  <FormField label="GST rate (%)" htmlFor="qf-gst"><Input id="qf-gst" type="number" min="0" value={gstRatePercent} onChange={(e) => setGstRatePercent(e.target.value)} /></FormField>
                  <FormField label="Valid until" htmlFor="qf-valid-until"><Input id="qf-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></FormField>
                  <label className="col-span-full flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5" checked={itemLevelPricingEnabled} onChange={(e) => setItemLevelPricingEnabled(e.target.checked)} />
                    <span>Show individual service prices to the customer <span className="block text-xs text-muted-foreground">Off by default.</span></span>
                  </label>
                </>
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
                </div>
              ),
            },
            {
              id: "terms",
              columns: 1,
              children: <FormField label="Terms" htmlFor="qf-terms" fullWidth><Textarea id="qf-terms" rows={3} value={termsText} onChange={(e) => setTermsText(e.target.value)} /></FormField>,
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create quotation"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
