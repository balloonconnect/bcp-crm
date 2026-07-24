export interface TaskForCompletion {
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
}

export interface TaskCompletionSummary {
  totalCount: number;
  completedCount: number;
  completedOnTimeCount: number;
  completionRatePercent: number; // of tasks assigned, how many are done
  onTimeRatePercent: number; // of completed tasks, how many beat their due date
}

/** Quantitative performance is computed from real task history, never a stored score — see `PerformanceNote`'s schema comment for why the stored model is only for the qualitative half. Tasks with no due date can't be judged "on time" one way or the other, so they're excluded from the on-time rate's denominator rather than counted against a person. */
export function computeTaskCompletionSummary(tasks: TaskForCompletion[]): TaskCompletionSummary {
  const totalCount = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed");
  const completedCount = completed.length;
  const withDueDate = completed.filter((t) => t.dueDate);
  const completedOnTimeCount = withDueDate.filter((t) => t.completedAt && t.dueDate && t.completedAt.getTime() <= t.dueDate.getTime()).length;

  return {
    totalCount,
    completedCount,
    completedOnTimeCount,
    completionRatePercent: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
    onTimeRatePercent: withDueDate.length > 0 ? (completedOnTimeCount / withDueDate.length) * 100 : 0,
  };
}

export interface AttendanceForRate {
  status: string;
}

export function computeAttendanceRate(records: AttendanceForRate[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status === "present" || r.status === "half_day").length;
  return (present / records.length) * 100;
}
