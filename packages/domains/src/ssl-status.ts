import type { DomainSslStatus } from "./types";

/** Certificates are renewed with a buffer before expiry, not right at the deadline — DNS/CA hiccups shouldn't cause a live outage. */
const RENEWAL_WINDOW_DAYS = 14;

export function needsSslRenewal(sslExpiresAt: Date | null, now: Date = new Date()): boolean {
  if (!sslExpiresAt) return false;
  const windowStart = new Date(sslExpiresAt.getTime() - RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return now.getTime() >= windowStart.getTime();
}

export function isSslExpired(sslExpiresAt: Date | null, now: Date = new Date()): boolean {
  if (!sslExpiresAt) return false;
  return sslExpiresAt.getTime() <= now.getTime();
}

/**
 * A domain can only be `active` (serving real traffic) once both DNS
 * ownership is verified AND SSL has actually been issued — serving a
 * custom domain over plain HTTP, or before ownership is confirmed, isn't
 * an acceptable intermediate state for production traffic.
 */
export function canActivate(input: { verified: boolean; sslStatus: DomainSslStatus }): boolean {
  return input.verified && input.sslStatus === "issued";
}

export interface SslStatusTransitionInput {
  currentStatus: DomainSslStatus;
  verified: boolean;
}

/** What SSL status a domain should move to right after DNS verification succeeds — provisioning begins immediately. */
export function nextSslStatusAfterVerification(input: SslStatusTransitionInput): DomainSslStatus {
  if (!input.verified) return input.currentStatus;
  if (input.currentStatus === "none") return "pending";
  return input.currentStatus;
}
