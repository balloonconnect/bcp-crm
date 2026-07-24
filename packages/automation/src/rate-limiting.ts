/** "Rate limiting" — per-rule, checked against how many times this specific rule has already run within the last hour. A runaway rule (one that triggers itself, directly or through a chain of other rules) is stopped here before it can spend a studio's entire monthly automation-run allowance in minutes. */
export function isRateLimited(recentExecutionCountInLastHour: number, maxExecutionsPerHour: number): boolean {
  return recentExecutionCountInLastHour >= maxExecutionsPerHour;
}
