"use client";

import * as React from "react";
import { ResponsiveDialog, cn } from "@bcp/ui";
import type { LeadRecord } from "../../lib/leads-context";
import { LeadDetailsTab } from "./tabs/lead-details-tab";
import { LeadNotesTab } from "./tabs/lead-notes-tab";
import { LeadCommunicationsTab } from "./tabs/lead-communications-tab";
import { LeadAttachmentsTab } from "./tabs/lead-attachments-tab";
import { LeadTimelineTab } from "./tabs/lead-timeline-tab";
import { LeadAiInsightsTab } from "./tabs/lead-ai-insights-tab";

const TABS = [
  { key: "details", label: "Details" },
  { key: "notes", label: "Notes" },
  { key: "communications", label: "Communication" },
  { key: "attachments", label: "Attachments" },
  { key: "timeline", label: "Timeline" },
  { key: "ai", label: "AI insights" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function LeadDetailDialog({ lead, open, onOpenChange, onEdit }: { lead: LeadRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void }) {
  const [tab, setTab] = React.useState<TabKey>("details");

  React.useEffect(() => {
    if (open) setTab("details");
  }, [open, lead?.id]);

  if (!lead) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={lead.name} description={[lead.eventType, lead.city].filter(Boolean).join(" · ") || undefined} className="sm:max-w-2xl">
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Lead detail sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "border-b-2 border-brand text-brand" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {tab === "details" && <LeadDetailsTab lead={lead} onEdit={onEdit} />}
          {tab === "notes" && <LeadNotesTab leadId={lead.id} />}
          {tab === "communications" && <LeadCommunicationsTab leadId={lead.id} />}
          {tab === "attachments" && <LeadAttachmentsTab leadId={lead.id} />}
          {tab === "timeline" && <LeadTimelineTab leadId={lead.id} />}
          {tab === "ai" && <LeadAiInsightsTab leadId={lead.id} />}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
