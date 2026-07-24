export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

/** The next occurrence date for a recurring task — computed from calendar arithmetic (not a fixed millisecond offset), so a monthly task due on the 31st behaves the way a person expects across shorter months, not by drifting via a fixed "30 days" approximation. */
export function computeNextOccurrence(from: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + interval);
  else if (frequency === "weekly") next.setDate(next.getDate() + interval * 7);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + interval);
  return next;
}
