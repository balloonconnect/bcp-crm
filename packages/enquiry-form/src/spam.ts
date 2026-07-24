export interface SpamCheckInput {
  /** Honeypot field value — real visitors never see or fill this; any non-empty value is a strong bot signal. */
  honeypotValue?: string;
  /** Milliseconds between the form rendering client-side and the server receiving the submission. */
  msSinceRendered?: number | null;
  /** How many submissions this same IP has made to any of the studio's forms in the last hour (server supplies this — see rate-limiting below). */
  recentSubmissionsFromIp?: number;
}

export interface SpamCheckResult {
  isSpam: boolean;
  reason: string | null;
}

const MIN_HUMAN_FILL_TIME_MS = 2500; // a real person can't read+fill a multi-field form faster than this
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 5;

/**
 * Pure heuristic spam check — no external CAPTCHA/anti-abuse service
 * integrated in this phase (that's a real third-party dependency and
 * API key to manage, better suited to a dedicated later pass once
 * there's real spam volume to tune against). Three independent signals,
 * any one of which is enough to flag: a filled honeypot, an
 * implausibly fast submission, or high submission velocity from one IP
 * — the last of these is also independently enforced as a hard rate
 * limit (see docs/enquiry-form.md), not just a spam *flag*.
 */
export function checkForSpam(input: SpamCheckInput): SpamCheckResult {
  if (input.honeypotValue && input.honeypotValue.trim().length > 0) {
    return { isSpam: true, reason: "honeypot_filled" };
  }

  if (input.msSinceRendered !== null && input.msSinceRendered !== undefined && input.msSinceRendered < MIN_HUMAN_FILL_TIME_MS) {
    return { isSpam: true, reason: "submitted_too_fast" };
  }

  if ((input.recentSubmissionsFromIp ?? 0) > MAX_SUBMISSIONS_PER_IP_PER_HOUR) {
    return { isSpam: true, reason: "high_submission_velocity" };
  }

  return { isSpam: false, reason: null };
}

export { MIN_HUMAN_FILL_TIME_MS, MAX_SUBMISSIONS_PER_IP_PER_HOUR };
