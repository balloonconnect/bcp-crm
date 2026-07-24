export interface TaskForWorkload {
  status: string;
  dueDate: Date | null;
}

export interface WorkloadSummary {
  activeTaskCount: number;
  overdueTaskCount: number;
  upcomingEventCount: number;
}

/** "Workload" is computed directly from a person's current tasks and events, not stored — the same reasoning every other computed-metric in this codebase follows (margins, relationship scores): a stored count would drift the moment a task's status changes elsewhere. */
export function computeWorkloadSummary(tasks: TaskForWorkload[], upcomingEventCount: number, now: Date = new Date()): WorkloadSummary {
  const activeTaskCount = tasks.filter((t) => t.status === "pending" || t.status === "in_progress" || t.status === "blocked").length;
  const overdueTaskCount = tasks.filter((t) => t.dueDate && t.dueDate.getTime() < now.getTime() && t.status !== "completed" && t.status !== "cancelled").length;
  return { activeTaskCount, overdueTaskCount, upcomingEventCount };
}
