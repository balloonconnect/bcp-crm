import { generateOpaqueToken, hashOpaqueToken } from "./opaque-tokens";

export type VerificationPurpose = "email_verification" | "password_reset" | "login_otp";

const DEFAULT_TTL_MINUTES: Record<VerificationPurpose, number> = {
  email_verification: 60 * 24, // 24h — low risk, link only proves mailbox ownership
  password_reset: 30, // 30m — higher risk, short window
  login_otp: 10, // 10m — typed by hand, kept short
};

export interface IssuedVerificationToken {
  /** Send this in the email link/SMS — never store it. */
  token: string;
  /** Persist this on the VerificationToken row instead. */
  tokenHash: string;
  expiresAt: Date;
}

export function issueVerificationToken(
  purpose: VerificationPurpose,
  now: Date = new Date(),
): IssuedVerificationToken {
  const token = generateOpaqueToken(32);
  const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MINUTES[purpose] * 60_000);
  return { token, tokenHash: hashOpaqueToken(token), expiresAt };
}

export interface VerificationTokenRecord {
  tokenHash: string;
  purpose: VerificationPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
}

export type VerificationTokenValidation =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "already_used" };

/**
 * Validates a presented token against the record loaded by its hash (the
 * caller looks the row up via `WHERE token_hash = hashOpaqueToken(presented)`
 * — this function only checks the *state* of that row, not the lookup).
 */
export function validateVerificationToken(
  record: VerificationTokenRecord | null,
  now: Date = new Date(),
): VerificationTokenValidation {
  if (!record) return { ok: false, reason: "not_found" };
  if (record.consumedAt) return { ok: false, reason: "already_used" };
  if (record.expiresAt.getTime() < now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true };
}
