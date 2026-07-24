/**
 * "Never log" — the exact five categories named in the brief, each
 * mapped to the actual field-name patterns this codebase's own
 * request/response/log payloads would use for them. This is the one
 * list `@bcp/logger`'s pino instance configures its own `redact`
 * option from (see `packages/logger/src/index.ts`), so every logger
 * anywhere in this platform inherits the same redaction — a service
 * can't accidentally log a password by forgetting to redact it
 * locally, because the root logger itself never passes one through.
 *
 * Pino's `redact` uses dot-path wildcards; `*.field` matches `field`
 * at any depth, which is deliberately broad — better to over-redact a
 * field that happens to share a sensitive name than to under-redact
 * because it was nested one level deeper than expected.
 */
export const NEVER_LOG_PATHS = [
  // Passwords
  "*.password",
  "*.passwordHash",
  "*.currentPassword",
  "*.newPassword",
  // OTPs
  "*.otp",
  "*.otpCode",
  "*.verificationCode",
  "*.twoFactorSecret",
  "*.recoveryCode",
  // Access tokens
  "*.accessToken",
  "*.refreshToken",
  "*.authorization",
  "req.headers.authorization",
  "req.headers.cookie",
  "*.sessionToken",
  "*.apiKey",
  // Payment secrets
  "*.cardNumber",
  "*.cvv",
  "*.keySecret",
  "*.webhookSecret",
  "*.gatewaySecret",
  // Sensitive photo URLs (signed URLs embed a time-limited credential in the query string)
  "*.signedUrl",
  "*.downloadUrl",
] as const;

/** True when a field name (case-insensitive, ignoring exact path depth) matches one of the categories above — used by tests and by any ad-hoc logging call that wants to check before including a field, rather than relying on `redact` alone as the only line of defense. */
export function isSensitiveFieldName(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase();
  const sensitiveTerms = ["password", "otp", "verificationcode", "twofactorsecret", "recoverycode", "accesstoken", "refreshtoken", "authorization", "sessiontoken", "apikey", "cardnumber", "cvv", "keysecret", "webhooksecret", "gatewaysecret", "signedurl", "downloadurl"];
  return sensitiveTerms.some((term) => normalized.includes(term));
}
