import { checkPlanLimit, type PlanLimitCheck } from "@bcp/permissions";

/** The four required warning points, in ascending order. */
export const WARNING_THRESHOLDS = [70, 85, 95, 100] as const;
export type WarningThreshold = (typeof WARNING_THRESHOLDS)[number];

export type UsageWarningLevel = "ok" | 70 | 85 | 95 | 100;

export interface UsageWarning {
  level: UsageWarningLevel;
  percentUsed: number;
  check: PlanLimitCheck;
}

/**
 * Maps a usage percentage to the highest threshold it has crossed.
 * `100` means "at or past the limit" (`checkPlanLimit` already reports
 * `allowed: false` here) — everything below 70% is `"ok"` and produces no
 * warning at all.
 */
export function computeWarningLevel(percentUsed: number): UsageWarningLevel {
  if (percentUsed >= 100) return 100;
  if (percentUsed >= 95) return 95;
  if (percentUsed >= 85) return 85;
  if (percentUsed >= 70) return 70;
  return "ok";
}

/**
 * The single entry point for "how is this studio doing against this
 * limit" — wraps @bcp/permissions' `checkPlanLimit` (which only answers
 * allowed/not-allowed) with the four-tier warning level this spec
 * requires. `limit = null` (unlimited) always reports `"ok"`.
 */
export function evaluateUsageWarning(current: number, limit: number | null): UsageWarning {
  const check = checkPlanLimit(current, limit);

  if (limit === null || limit === undefined || limit <= 0) {
    return { level: check.allowed ? "ok" : 100, percentUsed: 0, check };
  }

  const percentUsed = Math.round((current / limit) * 10000) / 100;
  return { level: computeWarningLevel(percentUsed), percentUsed, check };
}

/** True only the instant a warning level is first reached — used to avoid re-notifying every single request once past a threshold. */
export function crossedNewThreshold(
  previousCurrent: number,
  newCurrent: number,
  limit: number | null,
): WarningThreshold | null {
  if (limit === null || limit === undefined || limit <= 0) return null;

  for (const threshold of WARNING_THRESHOLDS) {
    const thresholdCount = Math.ceil((threshold / 100) * limit);
    if (previousCurrent < thresholdCount && newCurrent >= thresholdCount) {
      return threshold;
    }
  }
  return null;
}
