export interface CheckoutWindow {
  checkedOutAt: Date;
  /** A checkout with no expected return and not yet checked in is treated as open-ended and *always* overlapping any new request — you can't tell when it'll free up, so it's safest to flag it rather than silently assume it won't conflict. */
  expectedReturnAt: Date | null;
  checkedInAt: Date | null;
}

function resolveCheckoutWindow(checkout: CheckoutWindow, now: Date): { start: Date; end: Date } {
  return { start: checkout.checkedOutAt, end: checkout.checkedInAt ?? checkout.expectedReturnAt ?? now };
}

function windowsOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

export interface EquipmentCheckoutCandidate {
  equipmentId: string;
  requestedFrom: Date;
  requestedUntil: Date | null;
  ownedQuantity: number;
}

export interface ExistingCheckout extends CheckoutWindow {
  id: string;
}

export interface CheckoutConflictResult {
  hasConflict: boolean;
  conflictingCheckoutIds: string[];
}

/**
 * Prevents equipment double-booking for the checkout flow — the same
 * "only conflicts once concurrent demand exceeds owned quantity" logic
 * `@bcp/events`' `detectEquipmentConflicts` uses for per-event bookings,
 * applied here to open-ended checkout windows instead of fixed event
 * slots. A studio that owns 3 of an item can have 3 simultaneous
 * checkouts before the 4th is flagged.
 */
export function checkCheckoutConflict(candidate: EquipmentCheckoutCandidate, existing: ExistingCheckout[], now: Date = new Date()): CheckoutConflictResult {
  const candidateWindow = { start: candidate.requestedFrom, end: candidate.requestedUntil ?? now };
  const overlapping = existing.filter((checkout) => checkout.checkedInAt === null && windowsOverlap(candidateWindow, resolveCheckoutWindow(checkout, now)));

  return {
    hasConflict: overlapping.length + 1 > candidate.ownedQuantity,
    conflictingCheckoutIds: overlapping.map((c) => c.id),
  };
}
