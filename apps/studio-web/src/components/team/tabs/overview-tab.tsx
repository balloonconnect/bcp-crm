"use client";

import * as React from "react";
import { AlertTriangle, Briefcase, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@bcp/ui";
import { apiGet } from "../../../lib/api-client";

interface Workload {
  workload: { activeTaskCount: number; overdueTaskCount: number; upcomingEventCount: number };
  taskCompletion: { completionRatePercent: number; onTimeRatePercent: number };
  attendanceRatePercent30d: number;
}
interface ConflictSummary {
  teamConflicts: { eventTitle: string; conflictsWith: { eventTitle: string }[] }[];
  travelConflicts: { eventTitle: string; conflictsWith: { eventTitle: string }[] }[];
}

export function OverviewTab({ studioUserId }: { studioUserId: string }) {
  const [workload, setWorkload] = React.useState<Workload | null>(null);
  const [conflicts, setConflicts] = React.useState<ConflictSummary | null>(null);

  React.useEffect(() => {
    void apiGet<Workload>(`/team-members/${studioUserId}/workload`).then((res) => res.ok && setWorkload(res.data ?? null));
    void apiGet<ConflictSummary>(`/team-members/${studioUserId}/conflicts`).then((res) => res.ok && setConflicts(res.data ?? null));
  }, [studioUserId]);

  const hasConflicts = conflicts && (conflicts.teamConflicts.length > 0 || conflicts.travelConflicts.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {workload && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="font-display text-2xl">{workload.workload.activeTaskCount}</p><p className="text-xs text-muted-foreground">Active tasks</p></div>
          <div><p className="font-display text-2xl">{workload.workload.upcomingEventCount}</p><p className="text-xs text-muted-foreground">Upcoming shoots</p></div>
          <div><p className="font-display text-2xl">{workload.taskCompletion.completionRatePercent.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Task completion</p></div>
          <div><p className="font-display text-2xl">{workload.attendanceRatePercent30d.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Attendance (30d)</p></div>
        </div>
      )}

      {workload && workload.workload.overdueTaskCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {workload.workload.overdueTaskCount} overdue task{workload.workload.overdueTaskCount === 1 ? "" : "s"}
        </p>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><CalendarIcon className="h-4 w-4" aria-hidden="true" />Event conflict warnings</h3>
        {!hasConflicts ? (
          <p className="text-sm text-muted-foreground">No scheduling conflicts in the upcoming schedule.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {conflicts!.teamConflicts.map((c, i) => (
              <div key={`team-${i}`} className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-sm">
                <Badge variant="warning">Double-booked</Badge>
                {c.eventTitle} overlaps with {c.conflictsWith.map((x) => x.eventTitle).join(", ")}
              </div>
            ))}
            {conflicts!.travelConflicts.map((c, i) => (
              <div key={`travel-${i}`} className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-sm">
                <Badge variant="warning"><Briefcase className="mr-1 h-3 w-3" aria-hidden="true" />Travel</Badge>
                {c.eventTitle} may not leave enough travel time before/after {c.conflictsWith.map((x) => x.eventTitle).join(", ")}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
