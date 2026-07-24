"use client";

import * as React from "react";
import { ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { getPipelineStage } from "@bcp/leads";
import { useLeads, formatRupees, type LeadRecord } from "../../lib/leads-context";

const PRIORITY_VARIANT = { low: "outline", medium: "secondary", high: "warning", urgent: "destructive" } as const;

export function LeadsTableView({ onOpenLead }: { onOpenLead: (lead: LeadRecord) => void }) {
  const { leads, loading, selectedIds, toggleSelected } = useLeads();

  const columns: DataColumn<LeadRecord>[] = [
    {
      id: "select",
      header: "",
      cell: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.name}`}
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelected(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
        />
      ),
      align: "center",
    },
    { id: "name", header: "Name", cell: (row) => row.name, isPrimary: true },
    { id: "event", header: "Event", cell: (row) => row.eventType ?? "—", hideBelow: "sm" },
    { id: "phone", header: "Mobile", cell: (row) => row.phone ?? "—", hideBelow: "md" },
    { id: "status", header: "Stage", cell: (row) => <Badge variant="outline">{getPipelineStage(row.status as never).label}</Badge> },
    { id: "priority", header: "Priority", cell: (row) => <Badge variant={PRIORITY_VARIANT[row.priority]}>{row.priority}</Badge>, hideBelow: "lg" },
    { id: "value", header: "Expected value", cell: (row) => formatRupees(row.expectedValue), align: "end", hideBelow: "lg" },
    { id: "followUp", header: "Follow-up", cell: (row) => (row.followUpAt ? new Date(row.followUpAt).toLocaleDateString("en-IN") : "—"), hideBelow: "xl" },
  ];

  return (
    <ResponsiveDataView
      columns={columns}
      rows={leads}
      getRowId={(row) => row.id}
      onRowClick={onOpenLead}
      isLoading={loading}
      emptyState={<p className="py-12 text-center text-sm text-muted-foreground">No leads yet — add your first one to get started.</p>}
    />
  );
}
