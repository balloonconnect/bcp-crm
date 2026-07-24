"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const CATEGORY_OPTIONS = [
  { value: "equipment", label: "Equipment" }, { value: "rent", label: "Rent" }, { value: "salaries", label: "Salaries" },
  { value: "marketing", label: "Marketing" }, { value: "travel", label: "Travel" }, { value: "printing", label: "Printing" }, { value: "other", label: "Other" },
];

interface VendorOption { id: string; name: string }
interface CostCentreOption { id: string; name: string }

export function ExpenseFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [vendors, setVendors] = React.useState<VendorOption[]>([]);
  const [costCentres, setCostCentres] = React.useState<CostCentreOption[]>([]);
  const [category, setCategory] = React.useState("other");
  const [amount, setAmount] = React.useState("");
  const [gstAmount, setGstAmount] = React.useState("");
  const [tdsAmount, setTdsAmount] = React.useState("");
  const [incurredOn, setIncurredOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = React.useState("");
  const [costCentreId, setCostCentreId] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [requireApproval, setRequireApproval] = React.useState(false);
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = React.useState("monthly");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    void apiGet<VendorOption[]>("/vendors").then((res) => res.ok && setVendors(res.data ?? []));
    void apiGet<CostCentreOption[]>("/cost-centres").then((res) => res.ok && setCostCentres(res.data ?? []));
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setCategory("other"); setAmount(""); setGstAmount(""); setTdsAmount("");
      setIncurredOn(new Date().toISOString().slice(0, 10));
      setVendorId(""); setCostCentreId(""); setEventId(""); setNotes("");
      setRequireApproval(false); setIsRecurring(false); setRecurrenceFrequency("monthly"); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      category,
      amount: Math.round(Number(amount) * 100),
      gstAmount: gstAmount ? Math.round(Number(gstAmount) * 100) : undefined,
      tdsAmount: tdsAmount ? Math.round(Number(tdsAmount) * 100) : undefined,
      incurredOn: new Date(incurredOn).toISOString(),
      vendorId: vendorId || undefined,
      costCentreId: costCentreId || undefined,
      eventId: eventId || undefined,
      notes: notes || undefined,
      requireApproval,
      isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      recurrenceInterval: isRecurring ? 1 : undefined,
    };

    const res = await apiPost("/expenses", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not log this expense");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New expense">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "expense",
              columns: 2,
              children: (
                <>
                  <FormField label="Category" htmlFor="ex-category"><Select id="ex-category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} /></FormField>
                  <FormField label="Date" htmlFor="ex-date"><Input id="ex-date" type="date" value={incurredOn} onChange={(e) => setIncurredOn(e.target.value)} /></FormField>
                  <FormField label="Amount (₹)" htmlFor="ex-amount" required><Input id="ex-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required /></FormField>
                  <FormField label="GST (₹)" htmlFor="ex-gst"><Input id="ex-gst" type="number" min="0" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} /></FormField>
                  <FormField label="TDS withheld (₹)" htmlFor="ex-tds"><Input id="ex-tds" type="number" min="0" value={tdsAmount} onChange={(e) => setTdsAmount(e.target.value)} /></FormField>
                  <FormField label="Vendor" htmlFor="ex-vendor"><Select id="ex-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} options={[{ value: "", label: "None" }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]} /></FormField>
                  <FormField label="Cost centre" htmlFor="ex-cost-centre"><Select id="ex-cost-centre" value={costCentreId} onChange={(e) => setCostCentreId(e.target.value)} options={[{ value: "", label: "None" }, ...costCentres.map((c) => ({ value: c.id, label: c.name }))]} /></FormField>
                  <FormField label="Event ID" htmlFor="ex-event" hint="Leave blank for a general expense"><Input id="ex-event" value={eventId} onChange={(e) => setEventId(e.target.value)} /></FormField>
                  <FormField label="Notes" htmlFor="ex-notes" fullWidth><Textarea id="ex-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "options",
              columns: 1,
              children: (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
                    Requires approval before payment
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                    Recurring expense
                  </label>
                  {isRecurring && (
                    <div className="mt-2">
                      <Select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value)} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} className="w-40" />
                    </div>
                  )}
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Logging…" : "Log expense"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
