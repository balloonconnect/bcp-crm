"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Button } from "@bcp/ui";
import { apiPost } from "../../lib/api-client";

const DOCUMENT_TYPE_OPTIONS = [
  { value: "tax_invoice", label: "Tax invoice" }, { value: "proforma_invoice", label: "Proforma invoice" }, { value: "non_gst_invoice", label: "Non-GST invoice" },
];

export function InvoiceFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [documentType, setDocumentType] = React.useState("tax_invoice");
  const [subtotal, setSubtotal] = React.useState("");
  const [discountValue, setDiscountValue] = React.useState("");
  const [gstRatePercent, setGstRatePercent] = React.useState("18");
  const [isInterState, setIsInterState] = React.useState(false);
  const [dueDate, setDueDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDocumentType("tax_invoice"); setSubtotal(""); setDiscountValue(""); setGstRatePercent("18");
      setIsInterState(false); setDueDate(""); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await apiPost("/invoices", {
      documentType,
      subtotal: Math.round(Number(subtotal) * 100),
      discountType: discountValue ? "fixed_amount" : undefined,
      discountValue: discountValue ? Math.round(Number(discountValue) * 100) : undefined,
      gstRatePercent: documentType === "non_gst_invoice" ? 0 : Number(gstRatePercent),
      isInterState,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
    if (!res.ok) {
      setError(res.error?.message ?? "Could not create this invoice");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New invoice">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "invoice",
              columns: 2,
              children: (
                <>
                  <FormField label="Document type" htmlFor="inv-type"><Select id="inv-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)} options={DOCUMENT_TYPE_OPTIONS} /></FormField>
                  <FormField label="Due date" htmlFor="inv-due"><Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></FormField>
                  <FormField label="Subtotal (₹)" htmlFor="inv-subtotal" required><Input id="inv-subtotal" type="number" min="0" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} required /></FormField>
                  <FormField label="Discount (₹)" htmlFor="inv-discount"><Input id="inv-discount" type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} /></FormField>
                  {documentType !== "non_gst_invoice" && (
                    <>
                      <FormField label="GST rate (%)" htmlFor="inv-gst"><Input id="inv-gst" type="number" min="0" max="100" value={gstRatePercent} onChange={(e) => setGstRatePercent(e.target.value)} /></FormField>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm">
                        <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
                        Inter-state (IGST)
                      </label>
                    </>
                  )}
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create invoice"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
