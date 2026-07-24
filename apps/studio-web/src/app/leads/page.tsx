"use client";

import * as React from "react";
import { Plus, Table2, Kanban, CalendarDays } from "lucide-react";
import { Button, cn } from "@bcp/ui";
import { LeadsProvider, useLeads, type LeadRecord } from "../../lib/leads-context";
import { LeadsTableView } from "../../components/leads/leads-table-view";
import { LeadsKanbanView } from "../../components/leads/leads-kanban-view";
import { LeadsCalendarView } from "../../components/leads/leads-calendar-view";
import { BulkActionsBar } from "../../components/leads/bulk-actions-bar";
import { LeadFormDialog } from "../../components/leads/lead-form-dialog";
import { LeadDetailDialog } from "../../components/leads/lead-detail-dialog";

const VIEWS = [
  { key: "table", label: "Table", icon: Table2 },
  { key: "kanban", label: "Kanban", icon: Kanban },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

function LeadsPageBody() {
  const { error } = useLeads();
  const [view, setView] = React.useState<ViewKey>("table");
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailLead, setDetailLead] = React.useState<LeadRecord | null>(null);
  const [editLead, setEditLead] = React.useState<LeadRecord | null>(null);

  function openLead(lead: LeadRecord) {
    setDetailLead(lead);
  }

  function handleEdit() {
    setEditLead(detailLead);
    setDetailLead(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Leads</h1>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="View" className="flex rounded-md border border-border p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={view === v.key}
                onClick={() => setView(v.key)}
                className={cn("flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium", view === v.key ? "bg-accent text-brand" : "text-muted-foreground")}
              >
                <v.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {v.label}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add lead
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      {view === "table" && <LeadsTableView onOpenLead={openLead} />}
      {view === "kanban" && <LeadsKanbanView onOpenLead={openLead} />}
      {view === "calendar" && <LeadsCalendarView onOpenLead={openLead} />}

      {view === "table" && <BulkActionsBar />}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <LeadFormDialog open={Boolean(editLead)} onOpenChange={(open) => !open && setEditLead(null)} lead={editLead} />
      <LeadDetailDialog lead={detailLead} open={Boolean(detailLead)} onOpenChange={(open) => !open && setDetailLead(null)} onEdit={handleEdit} />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <LeadsProvider>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8" data-tour="leads-list">
        <LeadsPageBody />
      </main>
    </LeadsProvider>
  );
}
