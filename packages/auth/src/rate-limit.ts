/**
 * Central place for auth-endpoint rate limits, consumed by apps/api's
 * `@fastify/rate-limit` per-route config (see apps/api/src/plugins/
 * rate-limit-auth.ts). Numbers live here, not scattered across route
 * files, so tuning them doesn't require hunting through every handler.
 *
 * Two dimensions are limited independently: per-IP (blunt brute-force
 * protection, cheap to bypass with many IPs but still raises the bar) and
 * per-account (the more important one — caps attempts against one email
 * regardless of source IP, which is what account lockout in lockout.ts
 * ultimately backstops once this is exhausted).
 */
export interface RateLimitRule {
  max: number;
  timeWindowSeconds: number;
}

export const AUTH_RATE_LIMITS = {
  /** POST /auth/login */
  loginPerIp: { max: 20, timeWindowSeconds: 60 } as RateLimitRule,
  loginPerAccount: { max: 10, timeWindowSeconds: 15 * 60 } as RateLimitRule,

  /** POST /auth/signup */
  signupPerIp: { max: 10, timeWindowSeconds: 60 * 60 } as RateLimitRule,

  /** POST /auth/otp/request */
  otpRequestPerAccount: { max: 5, timeWindowSeconds: 15 * 60 } as RateLimitRule,
  otpVerifyPerAccount: { max: 10, timeWindowSeconds: 15 * 60 } as RateLimitRule,

  /** POST /auth/forgot-password */
  passwordResetRequestPerAccount: { max: 5, timeWindowSeconds: 60 * 60 } as RateLimitRule,

  /** POST /auth/2fa/verify */
  twoFactorVerifyPerAccount: { max: 10, timeWindowSeconds: 15 * 60 } as RateLimitRule,

  /** Generic auth-adjacent endpoints not covered above (refresh, logout, etc). */
  defaultPerIp: { max: 60, timeWindowSeconds: 60 } as RateLimitRule,
} as const;
