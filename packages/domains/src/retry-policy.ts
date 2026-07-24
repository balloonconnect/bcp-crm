/**
 * DNS propagation is slow and unpredictable (minutes to, rarely, 48
 * hours), so verification retries back off progressively rather than
 * polling on a fixed interval — an aggressive fixed interval either
 * wastes lookups early (propagation hasn't happened yet) or responds too
 * slowly later (once it has). Mirrors the escalation shape of
 * @bcp/auth's account-lockout policy for consistency across the codebase.
 */
const RETRY_DELAYS_MINUTES = [1, 5, 15, 30, 60, 180, 360, 720]; // 1m, 5m, 15m, 30m, 1h, 3h, 6h, 12h, repeats at 12h thereafter
export const MAX_VERIFICATION_ATTEMPTS = 20; // ~1 week of retries at the tail-end 12h cadence

export function nextRetryDelayMinutes(attemptNumber: number): number {
  const index = Math.min(attemptNumber, RETRY_DELAYS_MINUTES.length - 1);
  return RETRY_DELAYS_MINUTES[index]!;
}

export function computeNextRetryAt(attemptNumber: number, now: Date = new Date()): Date {
  const minutes = nextRetryDelayMinutes(attemptNumber);
  return new Date(now.getTime() + minutes * 60_000);
}

export function hasExceededMaxAttempts(attemptCount: number): boolean {
  return attemptCount >= MAX_VERIFICATION_ATTEMPTS;
}

export interface RetryDecision {
  shouldRetry: boolean;
  nextRetryAt: Date | null;
  exhausted: boolean;
}

/** Called after a failed verification attempt to decide what happens next. */
export function evaluateRetry(attemptCountAfterThisFailure: number, now: Date = new Date()): RetryDecision {
  if (hasExceededMaxAttempts(attemptCountAfterThisFailure)) {
    return { shouldRetry: false, nextRetryAt: null, exhausted: true };
  }
  return {
    shouldRetry: true,
    nextRetryAt: computeNextRetryAt(attemptCountAfterThisFailure, now),
    exhausted: false,
  };
}
