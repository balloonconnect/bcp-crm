"use client";

import * as React from "react";
import { ResponsiveDialog, Button, FormField, Input, Select, Textarea } from "@bcp/ui";
import type { QuickActionKey } from "@bcp/dashboard";
import { apiGet, apiPost } from "../../lib/api-client";
import { useDashboard } from "../../lib/dashboard-context";

interface OptionRow {
  id: string;
  label: string;
}

function useOptions(path: string | null, mapLabel: (row: never) => string) {
  const [options, setOptions] = React.useState<OptionRow[]>([]);
  React.useEffect(() => {
    if (!path) return;
    void apiGet<never[]>(path).then((res) => {
      if (res.ok && res.data) setOptions(res.data.map((row) => ({ id: (row as { id: string }).id, label: mapLabel(row) })));
    });
    // mapLabel is stable per call site — intentionally not in deps to avoid refetching on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return options;
}

function SelectField({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (v: string) => void; options: OptionRow[]; hint?: string }) {
  return (
    <FormField label={label} htmlFor={`qa-${label}`} hint={hint}>
      <Select
        id={`qa-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: "", label: "None" }, ...options.map((o) => ({ value: o.id, label: o.label }))]}
      />
    </FormField>
  );
}

const ACTION_TITLES: Record<QuickActionKey, string> = {
  add_lead: "Add lead",
  add_client: "Add client",
  create_quotation: "Create quotation",
  record_payment: "Record payment",
  create_event: "Create event",
  upload_gallery: "Upload gallery",
  send_reminder: "Send reminder",
  create_invoice: "Create invoice",
};

export function QuickActionDialog({ actionKey, onClose }: { actionKey: QuickActionKey | null; onClose: () => void }) {
  const { refetch } = useDashboard();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const leadOptions = useOptions(actionKey === "create_quotation" || actionKey === "send_reminder" ? "/leads" : null, (l) => (l as { name: string }).name);
  const clientOptions = useOptions(
    actionKey === "create_quotation" || actionKey === "create_invoice" || actionKey === "send_reminder" ? "/customers" : null,
    (c) => (c as { name: string }).name,
  );
  const eventOptions = useOptions(
    actionKey === "create_quotation" || actionKey === "create_invoice" || actionKey === "upload_gallery" ? "/events" : null,
    (e) => (e as { title: string }).title,
  );
  const invoiceOptions = useOptions(actionKey === "record_payment" || actionKey === "send_reminder" ? "/invoices" : null, (i) => (i as { invoiceNumber: string }).invoiceNumber);

  React.useEffect(() => {
    setFields({});
    setError(null);
  }, [actionKey]);

  function setField(name: string, value: string) {
    setFields((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitAction(actionKey!, fields);
      await refetch();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!actionKey) return null;

  return (
    <ResponsiveDialog open={Boolean(actionKey)} onOpenChange={(open) => !open && onClose()} title={ACTION_TITLES[actionKey]}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {actionKey === "add_lead" && (
          <>
            <FormField label="Name" htmlFor="qa-name" required><Input id="qa-name" value={fields.name ?? ""} onChange={(e) => setField("name", e.target.value)} required /></FormField>
            <FormField label="Email" htmlFor="qa-email"><Input id="qa-email" type="email" value={fields.email ?? ""} onChange={(e) => setField("email", e.target.value)} /></FormField>
            <FormField label="Phone" htmlFor="qa-phone"><Input id="qa-phone" value={fields.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} /></FormField>
            <FormField label="Event type" htmlFor="qa-event-type"><Input id="qa-event-type" value={fields.eventType ?? ""} onChange={(e) => setField("eventType", e.target.value)} /></FormField>
          </>
        )}

        {actionKey === "add_client" && (
          <>
            <FormField label="Name" htmlFor="qa-name" required><Input id="qa-name" value={fields.name ?? ""} onChange={(e) => setField("name", e.target.value)} required /></FormField>
            <FormField label="Email" htmlFor="qa-email"><Input id="qa-email" type="email" value={fields.email ?? ""} onChange={(e) => setField("email", e.target.value)} /></FormField>
            <FormField label="Phone" htmlFor="qa-phone"><Input id="qa-phone" value={fields.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} /></FormField>
          </>
        )}

        {actionKey === "create_event" && (
          <>
            <FormField label="Title" htmlFor="qa-title" required><Input id="qa-title" value={fields.title ?? ""} onChange={(e) => setField("title", e.target.value)} required /></FormField>
            <FormField label="Event type" htmlFor="qa-event-type" required><Input id="qa-event-type" value={fields.eventType ?? ""} onChange={(e) => setField("eventType", e.target.value)} required /></FormField>
            <FormField label="Date & time" htmlFor="qa-scheduled-at" required><Input id="qa-scheduled-at" type="datetime-local" value={fields.scheduledAt ?? ""} onChange={(e) => setField("scheduledAt", e.target.value)} required /></FormField>
            <FormField label="Location" htmlFor="qa-location"><Input id="qa-location" value={fields.location ?? ""} onChange={(e) => setField("location", e.target.value)} /></FormField>
            <SelectField label="Lead (optional)" value={fields.leadId ?? ""} onChange={(v) => setField("leadId", v)} options={leadOptions} />
          </>
        )}

        {actionKey === "create_quotation" && (
          <>
            <SelectField label="Client" value={fields.clientId ?? ""} onChange={(v) => setField("clientId", v)} options={clientOptions} />
            <SelectField label="Lead" value={fields.leadId ?? ""} onChange={(v) => setField("leadId", v)} options={leadOptions} />
            <SelectField label="Event" value={fields.eventId ?? ""} onChange={(v) => setField("eventId", v)} options={eventOptions} />
            <FormField label="Amount (₹)" htmlFor="qa-subtotal" required><Input id="qa-subtotal" type="number" min="0" value={fields.subtotal ?? ""} onChange={(e) => setField("subtotal", e.target.value)} required /></FormField>
            <FormField label="GST (₹)" htmlFor="qa-gst"><Input id="qa-gst" type="number" min="0" value={fields.gstAmount ?? ""} onChange={(e) => setField("gstAmount", e.target.value)} /></FormField>
          </>
        )}

        {actionKey === "create_invoice" && (
          <>
            <SelectField label="Client" value={fields.clientId ?? ""} onChange={(v) => setField("clientId", v)} options={clientOptions} />
            <SelectField label="Event" value={fields.eventId ?? ""} onChange={(v) => setField("eventId", v)} options={eventOptions} />
            <FormField label="Amount (₹)" htmlFor="qa-subtotal" required><Input id="qa-subtotal" type="number" min="0" value={fields.subtotal ?? ""} onChange={(e) => setField("subtotal", e.target.value)} required /></FormField>
            <FormField label="GST (₹)" htmlFor="qa-gst"><Input id="qa-gst" type="number" min="0" value={fields.gstAmount ?? ""} onChange={(e) => setField("gstAmount", e.target.value)} /></FormField>
            <FormField label="Due date" htmlFor="qa-due-date"><Input id="qa-due-date" type="date" value={fields.dueDate ?? ""} onChange={(e) => setField("dueDate", e.target.value)} /></FormField>
          </>
        )}

        {actionKey === "record_payment" && (
          <>
            <SelectField label="Invoice" value={fields.invoiceId ?? ""} onChange={(v) => setField("invoiceId", v)} options={invoiceOptions} />
            <FormField label="Amount (₹)" htmlFor="qa-amount" required><Input id="qa-amount" type="number" min="0" value={fields.amount ?? ""} onChange={(e) => setField("amount", e.target.value)} required /></FormField>
            <FormField label="Method" htmlFor="qa-method">
              <Select id="qa-method" value={fields.method ?? "cash"} onChange={(e) => setField("method", e.target.value)} options={[{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "card", label: "Card" }, { value: "other", label: "Other" }]} />
            </FormField>
          </>
        )}

        {actionKey === "upload_gallery" && (
          <>
            <SelectField label="Event" value={fields.eventId ?? ""} onChange={(v) => setField("eventId", v)} options={eventOptions} />
            <FormField label="Photo count" htmlFor="qa-photo-count"><Input id="qa-photo-count" type="number" min="0" value={fields.photoCount ?? ""} onChange={(e) => setField("photoCount", e.target.value)} /></FormField>
          </>
        )}

        {actionKey === "send_reminder" && (
          <>
            <SelectField label="Lead" value={fields.leadId ?? ""} onChange={(v) => setField("leadId", v)} options={leadOptions} hint="Pick a lead, a client, or an invoice to remind." />
            <SelectField label="Client" value={fields.clientId ?? ""} onChange={(v) => setField("clientId", v)} options={clientOptions} />
            <SelectField label="Invoice" value={fields.invoiceId ?? ""} onChange={(v) => setField("invoiceId", v)} options={invoiceOptions} />
            <FormField label="Message" htmlFor="qa-message" required fullWidth><Textarea id="qa-message" rows={4} value={fields.message ?? ""} onChange={(e) => setField("message", e.target.value)} required /></FormField>
          </>
        )}

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
      </form>
    </ResponsiveDialog>
  );
}

async function submitAction(actionKey: QuickActionKey, fields: Record<string, string>): Promise<void> {
  const cleaned = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, fields[k]]).filter(([, v]) => v));

  let res;
  switch (actionKey) {
    case "add_lead":
      res = await apiPost("/leads", cleaned(["name", "email", "phone", "eventType"]));
      break;
    case "add_client":
      res = await apiPost("/customers", cleaned(["name", "email", "phone"]));
      break;
    case "create_event":
      res = await apiPost("/events", {
        ...cleaned(["title", "eventType", "location", "leadId"]),
        scheduledAt: fields.scheduledAt ? new Date(fields.scheduledAt).toISOString() : undefined,
      });
      break;
    case "create_quotation":
      res = await apiPost("/quotations", {
        ...cleaned(["clientId", "leadId", "eventId"]),
        subtotal: Number(fields.subtotal ?? 0) * 100,
        gstAmount: Number(fields.gstAmount ?? 0) * 100,
      });
      break;
    case "create_invoice":
      res = await apiPost("/invoices", {
        ...cleaned(["clientId", "eventId"]),
        subtotal: Number(fields.subtotal ?? 0) * 100,
        gstAmount: Number(fields.gstAmount ?? 0) * 100,
        dueDate: fields.dueDate ? new Date(fields.dueDate).toISOString() : undefined,
      });
      break;
    case "record_payment":
      res = await apiPost(`/invoices/${fields.invoiceId}/payments`, {
        amount: Number(fields.amount ?? 0) * 100,
        method: fields.method || "cash",
      });
      break;
    case "upload_gallery":
      res = await apiPost("/galleries", { eventId: fields.eventId, photoCount: fields.photoCount ? Number(fields.photoCount) : undefined });
      break;
    case "send_reminder":
      res = await apiPost("/reminders", cleaned(["leadId", "clientId", "invoiceId", "message"]));
      break;
  }

  if (res && !res.ok) throw new Error(res.error?.message ?? "Could not complete this action");
}
