import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A double-submit CSRF token — issued as a *non-httpOnly* cookie
 * (JavaScript running on this app's own origin can read it and echo it
 * back as a header) alongside the httpOnly refresh-token cookie
 * (JavaScript can never read that one). A cross-site attacker can
 * still cause the browser to send the refresh cookie automatically,
 * but has no way to read or guess the CSRF cookie's value to also
 * supply the matching header — same-origin JS can, a forged
 * cross-site request can't.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/** Constant-time comparison — a plain `===` would leak timing information about how many leading characters matched, in principle usable to brute-force the token character by character. */
export function verifyCsrfToken(cookieValue: string | undefined, headerValue: string | undefined): boolean {
  if (!cookieValue || !headerValue || cookieValue.length !== headerValue.length) return false;
  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(headerValue));
  } catch {
    return false;
  }
}
