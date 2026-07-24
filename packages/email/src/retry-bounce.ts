export interface EmailForRetry {
  status: string;
  retryCount: number;
}

const MAX_RETRIES = 3;

/** Same shape as `@bcp/whatsapp`'s retry logic, kept independent rather than shared since the two channels' failure semantics genuinely differ — email retries on `failed`. A `bounced` email is deliberately never retryable: a bounce is the provider (SES/Resend) telling the platform the address is undeliverable, and retrying a hard bounce just damages the studio's own sender reputation with no chance of success. */
export function canRetry(message: EmailForRetry): boolean {
  return message.status === "failed" && message.retryCount < MAX_RETRIES;
}

export function computeRetryDelayMinutes(retryCount: number): number {
  return 2 ** retryCount;
}

/**
 * Classifies a provider's bounce/error text into "hard" (permanently
 * undeliverable — mailbox doesn't exist, domain doesn't exist) or
 * "soft" (temporary — mailbox full, server briefly down). A hard bounce
 * is a strong signal to stop sending to that address entirely; a soft
 * bounce is just a reason to retry later, same as any other transient
 * failure. Pattern-matches the wording SES/Resend/SMTP servers
 * conventionally use, since providers don't return a clean structured
 * "hard vs soft" flag consistently.
 */
export function classifyBounce(reasonText: string): "hard" | "soft" {
  const hardIndicators = /does not exist|no such user|mailbox unavailable|invalid recipient|address rejected|user unknown/i;
  return hardIndicators.test(reasonText) ? "hard" : "soft";
}
