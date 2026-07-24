"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { VENDOR_CATEGORIES } from "@bcp/finance";
import { apiPost } from "../../lib/api-client";

export function VendorFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>(VENDOR_CATEGORIES[0]);
  const [contactPersonName, setContactPersonName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [paymentTerms, setPaymentTerms] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName(""); setCategory(VENDOR_CATEGORIES[0]); setContactPersonName(""); setContactPhone("");
      setContactEmail(""); setGstin(""); setPaymentTerms(""); setNotes(""); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await apiPost("/vendors", {
      name, category,
      contactPersonName: contactPersonName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      gstin: gstin || undefined,
      paymentTerms: paymentTerms || undefined,
      notes: notes || undefined,
    });
    if (!res.ok) {
      setError(res.error?.message ?? "Could not add this vendor");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New vendor">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "vendor",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="v-name" required fullWidth><Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
                  <FormField label="Category" htmlFor="v-category"><Select id="v-category" value={category} onChange={(e) => setCategory(e.target.value)} options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))} /></FormField>
                  <FormField label="GSTIN" htmlFor="v-gstin"><Input id="v-gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} /></FormField>
                  <FormField label="Contact person" htmlFor="v-contact-name"><Input id="v-contact-name" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} /></FormField>
                  <FormField label="Phone" htmlFor="v-phone"><Input id="v-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></FormField>
                  <FormField label="Email" htmlFor="v-email"><Input id="v-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></FormField>
                  <FormField label="Payment terms" htmlFor="v-terms" fullWidth><Input id="v-terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" /></FormField>
                  <FormField label="Notes" htmlFor="v-notes" fullWidth><Textarea id="v-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add vendor"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
