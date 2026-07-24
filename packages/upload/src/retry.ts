export interface SessionForRetry {
  status: string;
  retryCount: number;
}

const MAX_RETRIES = 5; // higher than the messaging channels' cap (3) — a flaky mobile connection dropping mid-upload is a much more routine failure mode than a WhatsApp/email send failing, and each retry only redoes the chunks that didn't land, not the whole file.

export function canRetry(session: SessionForRetry): boolean {
  return session.status === "failed" && session.retryCount < MAX_RETRIES;
}

export function computeRetryDelaySeconds(retryCount: number): number {
  return Math.min(60, 2 ** retryCount);
}

/** "Pause" and "resume" aren't a failure/retry — they're a deliberate, user-initiated state a session can sit in indefinitely without being treated as broken. Only `pending`/`uploading` can be paused; a completed or failed session pausing wouldn't mean anything. */
export function canPause(status: string): boolean {
  return status === "pending" || status === "uploading";
}

export function canResume(status: string): boolean {
  return status === "paused";
}
