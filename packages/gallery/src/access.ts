export type AccessCheckResult = "granted" | "expired" | "needs_password" | "needs_otp";

export interface GalleryAccessConfig {
  expiresAt: Date | null;
  passwordHash: string | null;
  otpRequired: boolean;
}

export interface GuestSessionState {
  passwordVerified: boolean;
  otpVerified: boolean;
}

/**
 * The single access gate every gallery request passes through —
 * expiry always wins first (an expired gallery is closed regardless
 * of whether a guest already has a valid session), then password, then
 * OTP. A gallery can require both a password *and* OTP; both must be
 * satisfied before access is granted, checked in that fixed order so
 * the guest is prompted for one thing at a time rather than both at
 * once.
 */
export function checkGalleryAccess(config: GalleryAccessConfig, session: GuestSessionState | null, now: Date = new Date()): AccessCheckResult {
  if (config.expiresAt && config.expiresAt.getTime() < now.getTime()) return "expired";
  if (config.passwordHash && !session?.passwordVerified) return "needs_password";
  if (config.otpRequired && !session?.otpVerified) return "needs_otp";
  return "granted";
}

/** A 6-digit numeric OTP — same shape as `@bcp/auth`'s existing email OTP flow (Prompt 16's quotation approval), kept independent here since gallery guests aren't necessarily identified by email the way a quotation approver is. */
export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isOtpValid(otpCode: string | null, otpExpiresAt: Date | null, submittedCode: string, now: Date = new Date()): boolean {
  if (!otpCode || !otpExpiresAt) return false;
  if (otpExpiresAt.getTime() < now.getTime()) return false;
  return otpCode === submittedCode;
}
