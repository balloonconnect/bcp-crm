export interface TimeWindow {
  start: Date;
  end: Date;
}

/** Two windows overlap if one starts before the other ends, both ways — the standard interval-overlap test. Touching endpoints (one ends exactly when the other starts) don't count as overlapping. */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** `Event.endAt` is optional — a shoot with no known end time is treated as lasting a conservative default, long enough that back-to-back same-day bookings still get flagged for a human to check, rather than silently assumed to never conflict. */
const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

export function resolveEventWindow(scheduledAt: Date, endAt: Date | null | undefined): TimeWindow {
  return { start: scheduledAt, end: endAt ?? new Date(scheduledAt.getTime() + DEFAULT_EVENT_DURATION_MS) };
}

export interface ConflictCandidate {
  eventId: string;
  eventTitle: string;
  window: TimeWindow;
}

export interface ResourceConflict {
  eventId: string;
  eventTitle: string;
}

/**
 * The shared primitive behind every conflict check in this module: given
 * the window being booked and a list of candidate events *already*
 * booked for the same resource (team member / equipment item / branch),
 * returns the ones whose windows actually overlap. Team and equipment
 * conflicts both call this directly; travel conflicts add a buffer (see
 * `detectTravelConflicts` below) rather than requiring exact overlap.
 */
function findOverlapping(window: TimeWindow, candidates: ConflictCandidate[], excludeEventId?: string): ResourceConflict[] {
  return candidates
    .filter((c) => c.eventId !== excludeEventId && windowsOverlap(window, c.window))
    .map((c) => ({ eventId: c.eventId, eventTitle: c.eventTitle }));
}

export interface TeamConflictInput {
  window: TimeWindow;
  excludeEventId?: string;
  /** For each team member being assigned to the new/edited event, the events they're *already* booked on. */
  assignments: { studioUserId: string; studioUserName: string; existingEvents: ConflictCandidate[] }[];
}
export interface TeamConflict {
  studioUserId: string;
  studioUserName: string;
  conflictsWith: ResourceConflict[];
}

export function detectTeamConflicts(input: TeamConflictInput): TeamConflict[] {
  const conflicts: TeamConflict[] = [];
  for (const assignment of input.assignments) {
    const overlapping = findOverlapping(input.window, assignment.existingEvents, input.excludeEventId);
    if (overlapping.length > 0) conflicts.push({ studioUserId: assignment.studioUserId, studioUserName: assignment.studioUserName, conflictsWith: overlapping });
  }
  return conflicts;
}

export interface EquipmentConflictInput {
  window: TimeWindow;
  excludeEventId?: string;
  /** For each equipment item being assigned, how many units the studio owns and which existing bookings (with their requested quantity) overlap in time. */
  items: { equipmentId: string; equipmentName: string; ownedQuantity: number; requestedQuantity: number; existingBookings: (ConflictCandidate & { quantity: number })[] }[];
}
export interface EquipmentConflict {
  equipmentId: string;
  equipmentName: string;
  conflictsWith: ResourceConflict[];
}

/** Equipment only conflicts once concurrent demand exceeds what the studio owns — two events both wanting 1 of 3 owned tripods at the same time isn't a conflict; two events both wanting 2 of 3 is. */
export function detectEquipmentConflicts(input: EquipmentConflictInput): EquipmentConflict[] {
  const conflicts: EquipmentConflict[] = [];
  for (const item of input.items) {
    const overlappingBookings = item.existingBookings.filter((b) => b.eventId !== input.excludeEventId && windowsOverlap(input.window, b.window));
    const concurrentDemand = item.requestedQuantity + overlappingBookings.reduce((sum, b) => sum + b.quantity, 0);
    if (concurrentDemand > item.ownedQuantity) {
      conflicts.push({ equipmentId: item.equipmentId, equipmentName: item.equipmentName, conflictsWith: overlappingBookings.map((b) => ({ eventId: b.eventId, eventTitle: b.eventTitle })) });
    }
  }
  return conflicts;
}

export interface DateTimeConflictInput {
  window: TimeWindow;
  excludeEventId?: string;
  /** Other events at the same branch/venue, regardless of team/equipment overlap — catches a plain double-booking of the same physical location before anyone's even assigned to it. */
  existingEvents: ConflictCandidate[];
}

export function detectDateTimeConflicts(input: DateTimeConflictInput): ResourceConflict[] {
  return findOverlapping(input.window, input.existingEvents, input.excludeEventId);
}

export interface TravelConflictInput {
  window: TimeWindow;
  excludeEventId?: string;
  venue?: string | null;
  /** For each team member being assigned, their other bookings with each one's venue attached. */
  assignments: { studioUserId: string; studioUserName: string; existingEvents: (ConflictCandidate & { venue?: string | null })[] }[];
  /** Minimum gap required between two different-venue events for the same person to realistically travel between them. */
  bufferMinutes?: number;
}
export interface TravelConflict {
  studioUserId: string;
  studioUserName: string;
  conflictsWith: ResourceConflict[];
}

/**
 * Distinct from a plain team-availability conflict: two events at the
 * *same* venue back-to-back are fine (the team member doesn't need to
 * travel), but two events at *different* venues without enough gap
 * between them are flagged even if their windows don't strictly
 * overlap — this is the "travel overlap" case the brief names
 * separately from general team conflicts.
 */
export function detectTravelConflicts(input: TravelConflictInput): TravelConflict[] {
  const bufferMs = (input.bufferMinutes ?? 90) * 60 * 1000;
  const conflicts: TravelConflict[] = [];

  for (const assignment of input.assignments) {
    const conflictsWith: ResourceConflict[] = [];
    for (const existing of assignment.existingEvents) {
      if (existing.eventId === input.excludeEventId) continue;
      const sameVenue = input.venue && existing.venue && input.venue === existing.venue;
      if (sameVenue) continue;

      const gapBefore = input.window.start.getTime() - existing.window.end.getTime();
      const gapAfter = existing.window.start.getTime() - input.window.end.getTime();
      const noRealGap = windowsOverlap(input.window, existing.window) || (gapBefore >= 0 && gapBefore < bufferMs) || (gapAfter >= 0 && gapAfter < bufferMs);

      if (noRealGap) conflictsWith.push({ eventId: existing.eventId, eventTitle: existing.eventTitle });
    }
    if (conflictsWith.length > 0) conflicts.push({ studioUserId: assignment.studioUserId, studioUserName: assignment.studioUserName, conflictsWith });
  }

  return conflicts;
}
