export type SlaStatus = "no_sla" | "on_track" | "at_risk" | "breached";

export interface TaskForSla {
  status: string;
  slaDeadline: Date | null;
}

/** "At risk" is the last 20% of the SLA window — close enough to the deadline to warrant attention before it's actually missed, without flagging a task the moment it's created. A completed or cancelled task is never at risk or breached, whatever its deadline says — the SLA clock stopped mattering once the work stopped being outstanding. */
export function resolveSlaStatus(task: TaskForSla, startedAt: Date | null, now: Date = new Date()): SlaStatus {
  if (!task.slaDeadline) return "no_sla";
  if (task.status === "completed" || task.status === "cancelled") return "on_track";

  if (now.getTime() >= task.slaDeadline.getTime()) return "breached";

  if (startedAt) {
    const totalWindow = task.slaDeadline.getTime() - startedAt.getTime();
    const remaining = task.slaDeadline.getTime() - now.getTime();
    if (totalWindow > 0 && remaining / totalWindow <= 0.2) return "at_risk";
  }

  return "on_track";
}

export function resolveSlaDeadline(startedAt: Date, slaHours: number): Date {
  return new Date(startedAt.getTime() + slaHours * 60 * 60 * 1000);
}

export interface TaskForEscalation {
  slaDeadline: Date | null;
  escalatedAt: Date | null;
  status: string;
}

/** A task escalates once — past its SLA deadline, still open, not already escalated. Re-escalating an already-escalated task repeatedly would just be noise; once is the signal that something needs attention. */
export function shouldEscalate(task: TaskForEscalation, now: Date = new Date()): boolean {
  if (!task.slaDeadline || task.escalatedAt) return false;
  if (task.status === "completed" || task.status === "cancelled") return false;
  return now.getTime() >= task.slaDeadline.getTime();
}
