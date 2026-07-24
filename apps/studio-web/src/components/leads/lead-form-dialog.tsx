"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { LEAD_SOURCES, LEAD_PRIORITIES, leadInputSchema } from "@bcp/leads";
import { apiPost, apiPatch } from "../../lib/api-client";
import { useLeads, type LeadRecord } from "../../lib/leads-context";
import { DuplicateWarning } from "./duplicate-warning";

export interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadRecord | null;
}

const emptyForm = {
  name: "", brideName: "", groomName: "", phone: "", alternateMobile: "", email: "",
  instagramProfile1: "", instagramProfile2: "", eventType: "", eventDate: "", venue: "", city: "",
  source: "other", budget: "", interestedPackage: "", notes: "", priority: "medium",
  followUpAt: "", expectedValue: "", winProbability: "",
};

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const { refetch } = useLeads();
  const [fields, setFields] = React.useState<Record<string, string>>(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [duplicateCheckKey, setDuplicateCheckKey] = React.useState(0);

  React.useEffect(() => {
    if (lead) {
      setFields({
        name: lead.name, brideName: lead.brideName ?? "", groomName: lead.groomName ?? "",
        phone: lead.phone ?? "", alternateMobile: lead.alternateMobile ?? "", email: lead.email ?? "",
        instagramProfile1: lead.instagramProfile1 ?? "", instagramProfile2: lead.instagramProfile2 ?? "",
        eventType: lead.eventType ?? "", eventDate: lead.eventDate?.slice(0, 10) ?? "", venue: lead.venue ?? "", city: lead.city ?? "",
        source: lead.source, budget: lead.budget ? String(lead.budget / 100) : "", interestedPackage: lead.interestedPackage ?? "",
        notes: lead.notes ?? "", priority: lead.priority, followUpAt: lead.followUpAt?.slice(0, 10) ?? "",
        expectedValue: lead.expectedValue ? String(lead.expectedValue / 100) : "", winProbability: lead.winProbability ? String(lead.winProbability) : "",
      });
    } else {
      setFields(emptyForm);
    }
    setError(null);
  }, [lead, open]);

  function setField(name: string, value: string) {
    setFields((f) => ({ ...f, [name]: value }));
    if (["phone", "alternateMobile", "email", "instagramProfile1", "instagramProfile2"].includes(name)) {
      setDuplicateCheckKey((k) => k + 1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: fields.name,
      brideName: fields.brideName || undefined,
      groomName: fields.groomName || undefined,
      phone: fields.phone || undefined,
      alternateMobile: fields.alternateMobile || undefined,
      email: fields.email || undefined,
      instagramProfile1: fields.instagramProfile1 || undefined,
      instagramProfile2: fields.instagramProfile2 || undefined,
      eventType: fields.eventType || undefined,
      eventDate: fields.eventDate ? new Date(fields.eventDate).toISOString() : undefined,
      venue: fields.venue || undefined,
      city: fields.city || undefined,
      source: fields.source || undefined,
      budget: fields.budget ? Math.round(Number(fields.budget) * 100) : undefined,
      interestedPackage: fields.interestedPackage || undefined,
      notes: fields.notes || undefined,
      priority: fields.priority || undefined,
      followUpAt: fields.followUpAt ? new Date(fields.followUpAt).toISOString() : undefined,
      expectedValue: fields.expectedValue ? Math.round(Number(fields.expectedValue) * 100) : undefined,
      winProbability: fields.winProbability ? Number(fields.winProbability) : undefined,
    };

    const parsed = lead ? payload : leadInputSchema.safeParse(payload);
    if (!lead && !parsed.success) {
      setError((parsed as { success: false; error: { issues: { message: string }[] } }).error.issues[0]?.message ?? "Please check the form");
      setSubmitting(false);
      return;
    }

    try {
      const res = lead ? await apiPatch(`/leads/${lead.id}`, payload) : await apiPost("/leads", payload);
      if (!res.ok) throw new Error(res.error?.message ?? "Could not save this lead");
      await refetch();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={lead ? "Edit lead" : "Add lead"} className="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <ResponsiveFormLayout
          sections={[
            {
              id: "contact",
              title: "Contact",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="lf-name" required fullWidth><Input id="lf-name" value={fields.name} onChange={(e) => setField("name", e.target.value)} required /></FormField>
                  <FormField label="Bride name" htmlFor="lf-bride"><Input id="lf-bride" value={fields.brideName} onChange={(e) => setField("brideName", e.target.value)} /></FormField>
                  <FormField label="Groom name" htmlFor="lf-groom"><Input id="lf-groom" value={fields.groomName} onChange={(e) => setField("groomName", e.target.value)} /></FormField>
                  <FormField label="Mobile" htmlFor="lf-phone"><Input id="lf-phone" value={fields.phone} onChange={(e) => setField("phone", e.target.value)} /></FormField>
                  <FormField label="Alternate mobile" htmlFor="lf-alt-phone"><Input id="lf-alt-phone" value={fields.alternateMobile} onChange={(e) => setField("alternateMobile", e.target.value)} /></FormField>
                  <FormField label="Email" htmlFor="lf-email"><Input id="lf-email" type="email" value={fields.email} onChange={(e) => setField("email", e.target.value)} /></FormField>
                  <FormField label="Instagram profile 1" htmlFor="lf-ig1"><Input id="lf-ig1" value={fields.instagramProfile1} onChange={(e) => setField("instagramProfile1", e.target.value)} /></FormField>
                  <FormField label="Instagram profile 2" htmlFor="lf-ig2"><Input id="lf-ig2" value={fields.instagramProfile2} onChange={(e) => setField("instagramProfile2", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "event",
              title: "Event",
              columns: 2,
              children: (
                <>
                  <FormField label="Event type" htmlFor="lf-event-type"><Input id="lf-event-type" value={fields.eventType} onChange={(e) => setField("eventType", e.target.value)} /></FormField>
                  <FormField label="Event date" htmlFor="lf-event-date"><Input id="lf-event-date" type="date" value={fields.eventDate} onChange={(e) => setField("eventDate", e.target.value)} /></FormField>
                  <FormField label="Venue" htmlFor="lf-venue"><Input id="lf-venue" value={fields.venue} onChange={(e) => setField("venue", e.target.value)} /></FormField>
                  <FormField label="City" htmlFor="lf-city"><Input id="lf-city" value={fields.city} onChange={(e) => setField("city", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "sales",
              title: "Sales details",
              columns: 2,
              children: (
                <>
                  <FormField label="Source" htmlFor="lf-source">
                    <Select id="lf-source" value={fields.source} onChange={(e) => setField("source", e.target.value)} options={LEAD_SOURCES.map((s) => ({ value: s.key, label: s.label }))} />
                  </FormField>
                  <FormField label="Priority" htmlFor="lf-priority">
                    <Select id="lf-priority" value={fields.priority} onChange={(e) => setField("priority", e.target.value)} options={LEAD_PRIORITIES.map((p) => ({ value: p.key, label: p.label }))} />
                  </FormField>
                  <FormField label="Budget (₹)" htmlFor="lf-budget"><Input id="lf-budget" type="number" min="0" value={fields.budget} onChange={(e) => setField("budget", e.target.value)} /></FormField>
                  <FormField label="Expected value (₹)" htmlFor="lf-expected-value"><Input id="lf-expected-value" type="number" min="0" value={fields.expectedValue} onChange={(e) => setField("expectedValue", e.target.value)} /></FormField>
                  <FormField label="Interested package" htmlFor="lf-package"><Input id="lf-package" value={fields.interestedPackage} onChange={(e) => setField("interestedPackage", e.target.value)} /></FormField>
                  <FormField label="Win probability (%)" htmlFor="lf-win-probability"><Input id="lf-win-probability" type="number" min="0" max="100" value={fields.winProbability} onChange={(e) => setField("winProbability", e.target.value)} /></FormField>
                  <FormField label="Follow-up date" htmlFor="lf-follow-up"><Input id="lf-follow-up" type="date" value={fields.followUpAt} onChange={(e) => setField("followUpAt", e.target.value)} /></FormField>
                </>
              ),
            },
            {
              id: "notes",
              columns: 1,
              children: (
                <FormField label="Notes" htmlFor="lf-notes" fullWidth>
                  <Textarea id="lf-notes" rows={3} value={fields.notes} onChange={(e) => setField("notes", e.target.value)} />
                </FormField>
              ),
            },
          ]}
        />

        {!lead && <DuplicateWarning key={duplicateCheckKey} fields={fields} />}

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : lead ? "Save changes" : "Add lead"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
