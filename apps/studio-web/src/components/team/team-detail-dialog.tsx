"use client";

import * as React from "react";
import { ResponsiveDialog, cn } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import type { TeamMemberDetail } from "../../lib/team-context";
import { OverviewTab } from "./tabs/overview-tab";
import { HrDetailsTab } from "./tabs/hr-details-tab";
import { DocumentsEquipmentTab } from "./tabs/documents-equipment-tab";
import { AttendanceLeaveTab } from "./tabs/attendance-leave-tab";
import { PerformancePaymentsTab } from "./tabs/performance-payments-tab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "hr", label: "HR details" },
  { key: "documents", label: "Documents & equipment" },
  { key: "attendance", label: "Attendance & leave" },
  { key: "performance", label: "Performance & payments" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function TeamDetailDialog({ studioUserId, open, onOpenChange }: { studioUserId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [member, setMember] = React.useState<TeamMemberDetail | null>(null);

  const load = React.useCallback(async () => {
    if (!studioUserId) return;
    const res = await apiGet<TeamMemberDetail>(`/team-members/${studioUserId}`);
    if (res.ok && res.data) setMember(res.data);
  }, [studioUserId]);

  React.useEffect(() => {
    if (open) {
      setTab("overview");
      void load();
    }
  }, [open, load]);

  if (!member) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={member.name} description={member.roles.map((r) => r.studioRole.name).join(", ") || undefined} className="sm:max-w-2xl">
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Team member sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("shrink-0 rounded-t-md px-3 py-2 text-sm font-medium", tab === t.key ? "border-b-2 border-brand text-brand" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {tab === "overview" && <OverviewTab studioUserId={member.id} />}
          {tab === "hr" && <HrDetailsTab member={member} onSaved={load} />}
          {tab === "documents" && <DocumentsEquipmentTab studioUserId={member.id} />}
          {tab === "attendance" && <AttendanceLeaveTab studioUserId={member.id} />}
          {tab === "performance" && <PerformancePaymentsTab member={member} />}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
