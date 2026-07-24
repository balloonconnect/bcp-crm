/** "Exponential backoff" — doubling from the queue's own base delay, capped at 10 minutes so a slow-to-recover dependency doesn't leave a job waiting for hours between attempts. */
export function computeBackoffMs(baseBackoffMs: number, attemptNumber: number): number {
  const CAP_MS = 10 * 60 * 1000;
  return Math.min(baseBackoffMs * 2 ** Math.max(attemptNumber - 1, 0), CAP_MS);
}

/** "Retry" + "Dead-letter queue" — the one decision every job failure passes through: retry while attempts remain, move to the dead-letter queue once they're exhausted. Kept as a pure function so the DLQ decision is testable without a live queue. */
export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}

export function shouldMoveToDeadLetter(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}
