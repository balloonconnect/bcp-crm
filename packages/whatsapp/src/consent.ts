export type OptInStatus = "opted_in" | "opted_out" | "unknown";

/**
 * Only an explicit opt-out blocks sending — `unknown` (never asked)
 * is deliberately not treated the same as opted-out, since WhatsApp
 * Business messaging is normally permitted for existing business
 * relationships (a studio's own clients) without requiring a formal
 * opt-in flow first, the way marketing email does. A studio can still
 * choose to require explicit opt-in as its own policy; this function
 * only encodes the platform-level rule (a stated opt-out is always
 * binding), not a studio's stricter policy on top of it.
 */
export function canSendTo(status: OptInStatus): boolean {
  return status !== "opted_out";
}
