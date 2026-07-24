"use client";

import * as React from "react";
import { ResponsiveDialog, cn } from "@bcp/ui";
import type { ClientRecord } from "../../lib/clients-context";
import { ClientProfileTab } from "./tabs/client-profile-tab";
import { ClientTimelineTab } from "./tabs/client-timeline-tab";
import { ClientFamilyTab } from "./tabs/client-family-tab";
import { ClientCommunicationsTab } from "./tabs/client-communications-tab";
import { ClientContractsTab } from "./tabs/client-contracts-tab";
import { ClientFinancialsAiTab } from "./tabs/client-financials-ai-tab";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "family", label: "Family" },
  { key: "communications", label: "Communication" },
  { key: "contracts", label: "Contracts" },
  { key: "financials", label: "Financials & AI" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ClientDetailDialog({ client, open, onOpenChange, onEdit }: { client: ClientRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void }) {
  const [tab, setTab] = React.useState<TabKey>("profile");

  React.useEffect(() => {
    if (open) setTab("profile");
  }, [open, client?.id]);

  if (!client) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={client.name} description={[client.brideName, client.groomName].filter(Boolean).join(" & ") || undefined} className="sm:max-w-2xl">
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Client detail sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
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
          {tab === "profile" && <ClientProfileTab client={client} onEdit={onEdit} />}
          {tab === "timeline" && <ClientTimelineTab clientId={client.id} />}
          {tab === "family" && <ClientFamilyTab clientId={client.id} />}
          {tab === "communications" && <ClientCommunicationsTab clientId={client.id} />}
          {tab === "contracts" && <ClientContractsTab clientId={client.id} />}
          {tab === "financials" && <ClientFinancialsAiTab clientId={client.id} />}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
