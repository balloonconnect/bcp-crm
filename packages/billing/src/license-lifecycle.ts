export type LicenseStatus = "active" | "grace" | "suspended" | "expired" | "revoked";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_PERIOD_DAYS = 14;

/** A license's standard term is exactly one year from its start date. */
export function computeOneYearExpiry(startDate: Date): Date {
  return new Date(startDate.getTime() + ONE_YEAR_MS);
}

/** The grace period begins the moment a license expires and runs for a fixed window — same reasoning as Subscription's `grace` status (see docs/tenant-isolation.md § "Lifecycle states"): avoid an abrupt cutoff for a renewal that's simply in progress. */
export function computeGraceEndDate(expiresAt: Date, graceDays = DEFAULT_GRACE_PERIOD_DAYS): Date {
  return new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

export interface LicenseLifecycleInput {
  status: LicenseStatus;
  expiresAt: Date;
  graceEndsAt: Date | null;
}

/**
 * Resolves what a license's status *should* be right now, independent of
 * whatever is currently persisted — call this before trusting a stored
 * `status` for anything access-critical, since a license's clock keeps
 * ticking even if nothing has explicitly transitioned it yet (no job has
 * run to flip `active` → `expired` at the exact expiry instant).
 */
export function resolveEffectiveStatus(input: LicenseLifecycleInput, now: Date = new Date()): LicenseStatus {
  // Explicit terminal/held states always win — a revoke or manual suspend
  // is never overridden by date math.
  if (input.status === "revoked" || input.status === "suspended") return input.status;

  if (now.getTime() < input.expiresAt.getTime()) return "active";

  const graceEnd = input.graceEndsAt ?? computeGraceEndDate(input.expiresAt);
  if (now.getTime() < graceEnd.getTime()) return "grace";

  return "expired";
}

/** Whether a license currently grants access at all — `active` or `grace`, never `suspended`/`expired`/`revoked`. */
export function isLicenseUsable(input: LicenseLifecycleInput, now: Date = new Date()): boolean {
  const effective = resolveEffectiveStatus(input, now);
  return effective === "active" || effective === "grace";
}

/** A license can be renewed once it's within its final 60 days, or already in grace/expired (but not revoked). */
export function canRenew(input: LicenseLifecycleInput, now: Date = new Date()): boolean {
  if (input.status === "revoked") return false;
  const effective = resolveEffectiveStatus(input, now);
  if (effective === "grace" || effective === "expired") return true;
  const daysRemaining = (input.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return daysRemaining <= 60;
}
