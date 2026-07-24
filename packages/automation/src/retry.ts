const MAX_ATTEMPTS = 3;

/** "Retry" — up to 3 attempts per step, matching the same retry ceiling this codebase already uses for messaging channels (Prompt 24/25's WhatsApp/email send retries) rather than inventing a different number for automation specifically. */
export function hasRetriesRemaining(attemptCount: number): boolean {
  return attemptCount < MAX_ATTEMPTS;
}

/** Exponential backoff in minutes — 1, 2, 4 — capped, so a flaky webhook doesn't get hammered immediately three times in a row. */
export function computeRetryDelayMinutes(attemptCount: number): number {
  return Math.min(2 ** attemptCount, 30);
}
