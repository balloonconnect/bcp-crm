"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { EQUIPMENT_CATEGORIES } from "@bcp/equipment";
import { apiPost } from "../../lib/api-client";

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" }, { value: "damaged", label: "Damaged" },
];

export function EquipmentFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>(EQUIPMENT_CATEGORIES[0]);
  const [quantity, setQuantity] = React.useState("1");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState("");
  const [purchasePrice, setPurchasePrice] = React.useState("");
  const [replacementCost, setReplacementCost] = React.useState("");
  const [warrantyExpiresAt, setWarrantyExpiresAt] = React.useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = React.useState("");
  const [insuranceExpiresAt, setInsuranceExpiresAt] = React.useState("");
  const [condition, setCondition] = React.useState("good");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName(""); setCategory(EQUIPMENT_CATEGORIES[0]); setQuantity("1"); setSerialNumber("");
      setPurchaseDate(""); setPurchasePrice(""); setReplacementCost(""); setWarrantyExpiresAt("");
      setInsurancePolicyNumber(""); setInsuranceExpiresAt(""); setCondition("good"); setNotes(""); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name, category, quantity: Number(quantity) || 1,
      serialNumber: serialNumber || undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
      purchasePrice: purchasePrice ? Math.round(Number(purchasePrice) * 100) : undefined,
      replacementCost: replacementCost ? Math.round(Number(replacementCost) * 100) : undefined,
      warrantyExpiresAt: warrantyExpiresAt ? new Date(warrantyExpiresAt).toISOString() : undefined,
      insurancePolicyNumber: insurancePolicyNumber || undefined,
      insuranceExpiresAt: insuranceExpiresAt ? new Date(insuranceExpiresAt).toISOString() : undefined,
      condition,
      notes: notes || undefined,
    };

    const res = await apiPost("/equipment", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not add this equipment");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New equipment" className="sm:max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "equipment",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="eq-name" required fullWidth><Input id="eq-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
                  <FormField label="Category" htmlFor="eq-category"><Select id="eq-category" value={category} onChange={(e) => setCategory(e.target.value)} options={EQUIPMENT_CATEGORIES.map((c) => ({ value: c, label: c }))} /></FormField>
                  <FormField label="Quantity owned" htmlFor="eq-quantity"><Input id="eq-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></FormField>
                  <FormField label="Serial number" htmlFor="eq-serial"><Input id="eq-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></FormField>
                  <FormField label="Condition" htmlFor="eq-condition"><Select id="eq-condition" value={condition} onChange={(e) => setCondition(e.target.value)} options={CONDITION_OPTIONS} /></FormField>
                  <FormField label="Purchase date" htmlFor="eq-purchase-date"><Input id="eq-purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></FormField>
                  <FormField label="Purchase price (₹)" htmlFor="eq-purchase-price"><Input id="eq-purchase-price" type="number" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></FormField>
                  <FormField label="Replacement cost (₹)" htmlFor="eq-replacement-cost"><Input id="eq-replacement-cost" type="number" min="0" value={replacementCost} onChange={(e) => setReplacementCost(e.target.value)} /></FormField>
                  <FormField label="Warranty expires" htmlFor="eq-warranty"><Input id="eq-warranty" type="date" value={warrantyExpiresAt} onChange={(e) => setWarrantyExpiresAt(e.target.value)} /></FormField>
                  <FormField label="Insurance policy #" htmlFor="eq-insurance-policy"><Input id="eq-insurance-policy" value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} /></FormField>
                  <FormField label="Insurance expires" htmlFor="eq-insurance-expires"><Input id="eq-insurance-expires" type="date" value={insuranceExpiresAt} onChange={(e) => setInsuranceExpiresAt(e.target.value)} /></FormField>
                  <FormField label="Notes" htmlFor="eq-notes" fullWidth><Textarea id="eq-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add equipment"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
