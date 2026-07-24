"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Textarea, Button } from "@bcp/ui";
import { apiPost, apiPatch } from "../../lib/api-client";
import { useClients, type ClientRecord } from "../../lib/clients-context";

const emptyForm = {
  name: "", brideName: "", groomName: "", email: "", phone: "", notes: "",
  instagramProfile1: "", instagramProfile2: "", facebookProfile: "",
  billingAddressLine1: "", billingCity: "", billingState: "", billingPostalCode: "",
  shippingAddressLine1: "", shippingCity: "", shippingState: "", shippingPostalCode: "",
  gstin: "", gstLegalName: "",
  anniversaryDate: "", brideBirthday: "", groomBirthday: "",
  tagsText: "", referralNotes: "",
};

export function ClientFormDialog({ open, onOpenChange, client }: { open: boolean; onOpenChange: (open: boolean) => void; client?: ClientRecord | null }) {
  const { refetch } = useClients();
  const [fields, setFields] = React.useState(emptyForm);
  const [shippingSameAsBilling, setShippingSameAsBilling] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (client) {
      setFields({
        name: client.name, brideName: client.brideName ?? "", groomName: client.groomName ?? "",
        email: client.email ?? "", phone: client.phone ?? "", notes: client.notes ?? "",
        instagramProfile1: client.instagramProfile1 ?? "", instagramProfile2: client.instagramProfile2 ?? "", facebookProfile: client.facebookProfile ?? "",
        billingAddressLine1: client.billingAddressLine1 ?? "", billingCity: client.billingCity ?? "", billingState: client.billingState ?? "", billingPostalCode: client.billingPostalCode ?? "",
        shippingAddressLine1: client.shippingAddressLine1 ?? "", shippingCity: client.shippingCity ?? "", shippingState: "", shippingPostalCode: "",
        gstin: client.gstin ?? "", gstLegalName: client.gstLegalName ?? "",
        anniversaryDate: client.anniversaryDate?.slice(0, 10) ?? "", brideBirthday: client.brideBirthday?.slice(0, 10) ?? "", groomBirthday: client.groomBirthday?.slice(0, 10) ?? "",
        tagsText: client.tags.join(", "), referralNotes: client.referralNotes ?? "",
      });
      setShippingSameAsBilling(client.shippingSameAsBilling);
    } else {
      setFields(emptyForm);
      setShippingSameAsBilling(true);
    }
    setError(null);
  }, [client, open]);

  function setField(name: keyof typeof emptyForm, value: string) {
    setFields((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: fields.name,
      brideName: fields.brideName || undefined,
      groomName: fields.groomName || undefined,
      email: fields.email || undefined,
      phone: fields.phone || undefined,
      notes: fields.notes || undefined,
      instagramProfile1: fields.instagramProfile1 || undefined,
      instagramProfile2: fields.instagramProfile2 || undefined,
      facebookProfile: fields.facebookProfile || undefined,
      billingAddressLine1: fields.billingAddressLine1 || undefined,
      billingCity: fields.billingCity || undefined,
      billingState: fields.billingState || undefined,
      billingPostalCode: fields.billingPostalCode || undefined,
      shippingSameAsBilling,
      shippingAddressLine1: shippingSameAsBilling ? undefined : fields.shippingAddressLine1 || undefined,
      shippingCity: shippingSameAsBilling ? undefined : fields.shippingCity || undefined,
      gstin: fields.gstin || undefined,
      gstLegalName: fields.gstLegalName || undefined,
      anniversaryDate: fields.anniversaryDate ? new Date(fields.anniversaryDate).toISOString() : undefined,
      brideBirthday: fields.brideBirthday ? new Date(fields.brideBirthday).toISOString() : undefined,
      groomBirthday: fields.groomBirthday ? new Date(fields.groomBirthday).toISOString() : undefined,
      tags: fields.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      referralNotes: fields.referralNotes || undefined,
    };

    const res = client ? await apiPatch(`/clients/${client.id}`, payload) : await apiPost("/clients", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not save this client");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    await refetch();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={client ? "Edit client" : "Add client"} className="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <ResponsiveFormLayout
          sections={[
            {
              id: "basics",
              title: "Basics",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="cf-name" required fullWidth><Input id="cf-name" value={fields.name} onChange={(e) => setField("name", e.target.value)} required /></FormField>
                  <FormField label="Bride's name" htmlFor="cf-bride"><Input id="cf-bride" value={fields.brideName} onChange={(e) => setField("brideName", e.target.value)} /></FormField>
                  <FormField label="Groom's name" htmlFor="cf-groom"><Input id="cf-groom" value={fields.groomName} onChange={(e) => setField("groomName", e.target.value)} /></FormField>
                  <FormField label="Email" htmlFor="cf-email"><Input id="cf-email" type="email" value={fields.email} onChange={(e) => setField("email", e.target.value)} /></FormField>
                  <FormField label="Mobile" htmlFor="cf-phone"><Input id="cf-phone" value={fields.phone} onChange={(e) => setField("phone", e.target.value)} /></FormField>
                  <FormField label="Instagram" htmlFor="cf-ig1"><Input id="cf-ig1" value={fields.instagramProfile1} onChange={(e) => setField("instagramProfile1", e.target.value)} /></FormField>
                  <FormField label="Facebook" htmlFor="cf-fb"><Input id="cf-fb" value={fields.facebookProfile} onChange={(e) => setField("facebookProfile", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "billing",
              title: "Billing address",
              columns: 2,
              children: (
                <>
                  <FormField label="Address" htmlFor="cf-billing-address" fullWidth><Input id="cf-billing-address" value={fields.billingAddressLine1} onChange={(e) => setField("billingAddressLine1", e.target.value)} /></FormField>
                  <FormField label="City" htmlFor="cf-billing-city"><Input id="cf-billing-city" value={fields.billingCity} onChange={(e) => setField("billingCity", e.target.value)} /></FormField>
                  <FormField label="State" htmlFor="cf-billing-state"><Input id="cf-billing-state" value={fields.billingState} onChange={(e) => setField("billingState", e.target.value)} /></FormField>
                  <FormField label="Postal code" htmlFor="cf-billing-postal"><Input id="cf-billing-postal" value={fields.billingPostalCode} onChange={(e) => setField("billingPostalCode", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "shipping",
              title: "Shipping address",
              columns: 2,
              children: (
                <>
                  <label className="col-span-full flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={shippingSameAsBilling} onChange={(e) => setShippingSameAsBilling(e.target.checked)} />
                    Same as billing address
                  </label>
                  {!shippingSameAsBilling && (
                    <>
                      <FormField label="Address" htmlFor="cf-shipping-address" fullWidth><Input id="cf-shipping-address" value={fields.shippingAddressLine1} onChange={(e) => setField("shippingAddressLine1", e.target.value)} /></FormField>
                      <FormField label="City" htmlFor="cf-shipping-city"><Input id="cf-shipping-city" value={fields.shippingCity} onChange={(e) => setField("shippingCity", e.target.value)} /></FormField>
                    </>
                  )}
                </>
              ),
            },
            {
              id: "gst",
              title: "GST details",
              columns: 2,
              children: (
                <>
                  <FormField label="GSTIN" htmlFor="cf-gstin"><Input id="cf-gstin" value={fields.gstin} onChange={(e) => setField("gstin", e.target.value)} /></FormField>
                  <FormField label="Legal name" htmlFor="cf-gst-legal-name"><Input id="cf-gst-legal-name" value={fields.gstLegalName} onChange={(e) => setField("gstLegalName", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "dates",
              title: "Important dates",
              columns: 2,
              children: (
                <>
                  <FormField label="Anniversary" htmlFor="cf-anniversary"><Input id="cf-anniversary" type="date" value={fields.anniversaryDate} onChange={(e) => setField("anniversaryDate", e.target.value)} /></FormField>
                  <FormField label="Bride's birthday" htmlFor="cf-bride-bday"><Input id="cf-bride-bday" type="date" value={fields.brideBirthday} onChange={(e) => setField("brideBirthday", e.target.value)} /></FormField>
                  <FormField label="Groom's birthday" htmlFor="cf-groom-bday"><Input id="cf-groom-bday" type="date" value={fields.groomBirthday} onChange={(e) => setField("groomBirthday", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "other",
              title: "Tags, referral & notes",
              columns: 1,
              children: (
                <>
                  <FormField label="Tags" htmlFor="cf-tags" hint="Comma-separated" fullWidth><Input id="cf-tags" value={fields.tagsText} onChange={(e) => setField("tagsText", e.target.value)} /></FormField>
                  <FormField label="Referral notes" htmlFor="cf-referral-notes" fullWidth><Input id="cf-referral-notes" value={fields.referralNotes} onChange={(e) => setField("referralNotes", e.target.value)} /></FormField>
                  <FormField label="Notes" htmlFor="cf-notes" fullWidth><Textarea id="cf-notes" rows={3} value={fields.notes} onChange={(e) => setField("notes", e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : client ? "Save changes" : "Add client"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
