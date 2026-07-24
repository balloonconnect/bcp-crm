export type AlbumAccessResult = "granted" | "needs_otp";

/** Simpler than `@bcp/gallery`'s `checkGalleryAccess()` — a selection link only ever gates on OTP, never a password or expiry (a deadline is advisory here, not an access block; see `isPastDeadline()`). Kept as its own function rather than reusing the gallery one so this package doesn't take on gallery-specific concepts (password, hard expiry) it has no use for. */
export function checkAlbumAccess(otpRequired: boolean, otpVerified: boolean): AlbumAccessResult {
  if (otpRequired && !otpVerified) return "needs_otp";
  return "granted";
}

export function isPastDeadline(deadline: Date | null, now: Date = new Date()): boolean {
  if (!deadline) return false;
  return now.getTime() > deadline.getTime();
}

/** Days remaining until the deadline — negative once past it. Used to decide when a reminder is actually due (see `@bcp/selection`'s reminder scheduling in `apps/api`), not just whether it's already too late. */
export function daysUntilDeadline(deadline: Date | null, now: Date = new Date()): number | null {
  if (!deadline) return null;
  return Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
