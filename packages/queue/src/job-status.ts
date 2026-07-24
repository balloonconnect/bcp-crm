export type JobStatusKey = "queued" | "running" | "completed" | "failed" | "retrying" | "cancelled" | "dead_letter";

const ALLOWED_TRANSITIONS: Record<JobStatusKey, JobStatusKey[]> = {
  queued: ["running", "cancelled"],
  running: ["completed", "failed", "retrying", "cancelled"],
  retrying: ["running", "cancelled"],
  completed: [],
  failed: ["retrying", "dead_letter"],
  cancelled: [],
  dead_letter: [],
};

/** "Logs"/"Progress"/status tracking all rest on this one rule: a job's status only ever moves forward through a small, fixed set of transitions — a completed or cancelled job can never silently become "running" again, and a dead-letter job is genuinely terminal. */
export function canTransitionJobStatus(from: JobStatusKey, to: JobStatusKey): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** "Cancellation" — only ever possible before a job has reached a terminal state; cancelling a job that already completed or failed-to-dead-letter is a no-op, not an error, since the outcome is already fixed either way. */
export function canCancelJob(status: JobStatusKey): boolean {
  return status === "queued" || status === "running" || status === "retrying";
}
