export interface MessageForRetry {
  status: string;
  retryCount: number;
}

const MAX_RETRIES = 3;

/** Only a genuinely failed message is retryable, and only up to a small fixed cap — a message stuck in `queued` isn't "failed," it just hasn't been processed yet, and retrying indefinitely would let one bad number silently burn through a studio's message quota. */
export function canRetry(message: MessageForRetry): boolean {
  return message.status === "failed" && message.retryCount < MAX_RETRIES;
}

/** Exponential backoff in minutes before the next retry attempt — 1, 2, 4 minutes for attempts 1, 2, 3. */
export function computeRetryDelayMinutes(retryCount: number): number {
  return 2 ** retryCount;
}
