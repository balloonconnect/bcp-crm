export type ScheduleFrequency = "daily" | "weekly" | "monthly";

/** "Scheduled reports" — computes the next send date from now (or from the last send, when resuming a schedule), one calendar step ahead per the chosen frequency. Monthly preserves the day-of-month where the target month allows it, falling back to the last valid day (e.g. scheduling on the 31st rolls to the 28th/30th in a shorter month) rather than overflowing into the following month. */
export function computeNextSendAt(frequency: ScheduleFrequency, from: Date = new Date()): Date {
  const next = new Date(from);
  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    const targetDay = next.getDate();
    next.setMonth(next.getMonth() + 1, 1); // jump to the 1st of the target month first to avoid month-overflow surprises
    const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(targetDay, daysInTargetMonth));
  }
  return next;
}

export function isDue(nextSendAt: Date, now: Date = new Date()): boolean {
  return nextSendAt.getTime() <= now.getTime();
}
