export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/** Inclusive overlap check — a leave request that starts the day another one ends is treated as overlapping (both cover that day), matching how a person actually reads a leave calendar rather than a strict half-open interval. */
export function leaveRangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate.getTime() <= b.endDate.getTime() && b.startDate.getTime() <= a.endDate.getTime();
}

export function findOverlappingLeave(candidate: DateRange, existing: (DateRange & { id: string })[]): { id: string }[] {
  return existing.filter((leave) => leaveRangesOverlap(candidate, leave)).map((l) => ({ id: l.id }));
}
