"use client";

import * as React from "react";
import { Button, Select } from "@bcp/ui";
import { PIPELINE_STAGES, LOST_REASONS } from "@bcp/leads";
import { apiPost } from "../../../lib/api-client";
import { formatRupees, changeLeadStatus, useLeads, type LeadRecord } from "../../../lib/leads-context";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function LeadDetailsTab({ lead, onEdit }: { lead: LeadRecord; onEdit: () => void }) {
  const { refetch } = useLeads();
  const [status, setStatus] = React.useState(lead.status);
  const [lostReason, setLostReason] = React.useState("");
  const [converting, setConverting] = React.useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    if (newStatus !== "lost") {
      await changeLeadStatus(lead.id, newStatus);
      await refetch();
    }
  }

  async function handleConfirmLost() {
    await changeLeadStatus(lead.id, "lost", lostReason || undefined);
    await refetch();
  }

  async function handleConvert() {
    setConverting(true);
    await apiPost(`/leads/${lead.id}/convert`);
    await refetch();
    setConverting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(e) => void handleStatusChange(e.target.value)} options={PIPELINE_STAGES.map((s) => ({ value: s.key, label: s.label }))} className="w-auto" />
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        {lead.status !== "won" && (
          <Button type="button" size="sm" onClick={() => void handleConvert()} disabled={converting}>
            {converting ? "Converting…" : "Convert to client"}
          </Button>
        )}
      </div>

      {status === "lost" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
          <Select value={lostReason} onChange={(e) => setLostReason(e.target.value)} options={[{ value: "", label: "Select a reason" }, ...LOST_REASONS.map((r) => ({ value: r, label: r }))]} className="w-auto" />
          <Button type="button" size="sm" onClick={() => void handleConfirmLost()}>Confirm lost</Button>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Bride name" value={lead.brideName} />
        <Field label="Groom name" value={lead.groomName} />
        <Field label="Mobile" value={lead.phone} />
        <Field label="Alternate mobile" value={lead.alternateMobile} />
        <Field label="Email" value={lead.email} />
        <Field label="Instagram 1" value={lead.instagramProfile1} />
        <Field label="Instagram 2" value={lead.instagramProfile2} />
        <Field label="Event type" value={lead.eventType} />
        <Field label="Event date" value={lead.eventDate ? new Date(lead.eventDate).toLocaleDateString("en-IN") : null} />
        <Field label="Venue" value={lead.venue} />
        <Field label="City" value={lead.city} />
        <Field label="Source" value={lead.source} />
        <Field label="Budget" value={formatRupees(lead.budget)} />
        <Field label="Expected value" value={formatRupees(lead.expectedValue)} />
        <Field label="Interested package" value={lead.interestedPackage} />
        <Field label="Priority" value={lead.priority} />
        <Field label="Win probability" value={lead.winProbability !== null ? `${lead.winProbability}%` : null} />
        <Field label="Follow-up date" value={lead.followUpAt ? new Date(lead.followUpAt).toLocaleDateString("en-IN") : null} />
        <Field label="Lost reason" value={lead.lostReason} />
      </dl>

      {lead.notes && (
        <div>
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}
