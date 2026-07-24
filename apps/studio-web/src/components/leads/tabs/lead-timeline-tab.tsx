"use client";

import * as React from "react";
import { UserCircle, MessageSquare, Activity } from "lucide-react";
import { apiGet } from "../../../lib/api-client";

interface TimelineEntry {
  type: "activity" | "note" | "communication";
  id: string;
  occurredAt: string;
  summary: string;
  detail?: string;
}

const ICONS = { activity: Activity, note: MessageSquare, communication: UserCircle };

export function LeadTimelineTab({ leadId }: { leadId: string }) {
  const [entries, setEntries] = React.useState<TimelineEntry[]>([]);

  React.useEffect(() => {
    void apiGet<TimelineEntry[]>(`/leads/${leadId}/timeline`).then((res) => {
      if (res.ok && res.data) setEntries(res.data);
    });
  }, [leadId]);

  if (entries.length === 0) return <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => {
        const Icon = ICONS[entry.type];
        return (
          <li key={`${entry.type}-${entry.id}`} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm capitalize">{entry.summary}</p>
              {entry.detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.detail}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleString("en-IN")}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
