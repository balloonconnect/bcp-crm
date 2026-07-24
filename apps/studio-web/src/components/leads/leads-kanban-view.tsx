"use client";

import * as React from "react";
import { PIPELINE_STAGES } from "@bcp/leads";
import { useLeads, formatRupees, changeLeadStatus, type LeadRecord } from "../../lib/leads-context";

export function LeadsKanbanView({ onOpenLead }: { onOpenLead: (lead: LeadRecord) => void }) {
  const { leads, refetch } = useLeads();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  async function handleDrop(status: string) {
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (lead && lead.status !== status) {
      await changeLeadStatus(draggingId, status);
      await refetch();
    }
    setDraggingId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage.key);
        return (
          <div
            key={stage.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(stage.key)}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {stageLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  draggable
                  onDragStart={() => setDraggingId(lead.id)}
                  onClick={() => onOpenLead(lead)}
                  className="cursor-grab rounded-md border border-border bg-card p-3 text-left text-sm shadow-sm active:cursor-grabbing"
                >
                  <p className="font-medium">{lead.name}</p>
                  {lead.eventType && <p className="text-xs text-muted-foreground">{lead.eventType}</p>}
                  {lead.expectedValue && <p className="mt-1 text-xs text-muted-foreground">{formatRupees(lead.expectedValue)}</p>}
                </button>
              ))}
              {stageLeads.length === 0 && <p className="px-1 text-xs text-muted-foreground">No leads</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
