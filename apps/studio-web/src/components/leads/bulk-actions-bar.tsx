"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button, Select, StickyActionBar } from "@bcp/ui";
import { PIPELINE_STAGES } from "@bcp/leads";
import { apiPost } from "../../lib/api-client";
import { useLeads } from "../../lib/leads-context";

export function BulkActionsBar() {
  const { selectedIds, clearSelection, refetch } = useLeads();
  const [status, setStatus] = React.useState("contacted");
  const [busy, setBusy] = React.useState(false);

  if (selectedIds.size === 0) return null;

  async function applyBulkStatus() {
    setBusy(true);
    await apiPost("/leads/bulk/status", { leadIds: [...selectedIds], status });
    await refetch();
    clearSelection();
    setBusy(false);
  }

  return (
    <StickyActionBar aboveMobileNav={false} className="justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Clear selection" onClick={clearSelection}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
        {selectedIds.size} selected
      </div>
      <div className="flex items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={PIPELINE_STAGES.map((s) => ({ value: s.key, label: s.label }))} className="w-auto" />
        <Button type="button" size="sm" disabled={busy} onClick={() => void applyBulkStatus()}>
          Move to stage
        </Button>
      </div>
    </StickyActionBar>
  );
}
