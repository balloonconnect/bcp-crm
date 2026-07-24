import { randomInt } from "node:crypto";
import { hashOpaqueToken } from "./opaque-tokens";

export interface GeneratedOtp {
  /** The plaintext code — email this, never store it. */
  code: string;
  /** Store this instead, alongside a purpose + expiry (see VerificationToken). */
  codeHash: string;
}

/**
 * Generates a 6-digit numeric OTP for email sign-in. Uses `crypto.randomInt`
 * (rejection-sampled, unbiased), not `Math.random()`.
 */
export function generateEmailOtp(): GeneratedOtp {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { code, codeHash: hashOpaqueToken(code) };
}

export function verifyEmailOtp(presentedCode: string, codeHash: string): boolean {
  return hashOpaqueToken(presentedCode) === codeHash;
}
