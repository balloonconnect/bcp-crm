export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ServiceHealthSnapshot {
  service: string;
  status: HealthStatus;
}

/** "Platform health dashboard" — the overall platform status is only ever as good as its worst service: any unhealthy service makes the whole platform unhealthy, any degraded service (with nothing worse) makes it degraded. A dashboard rollup that averaged statuses together could show "mostly fine" while a genuinely broken service hides in the noise. */
export function aggregateOverallHealth(snapshots: ServiceHealthSnapshot[]): HealthStatus {
  if (snapshots.some((s) => s.status === "unhealthy")) return "unhealthy";
  if (snapshots.some((s) => s.status === "degraded")) return "degraded";
  return "healthy";
}

export interface HealthCheckRecord {
  status: HealthStatus;
  checkedAt: Date;
}

/**
 * "Alert rules" — the evaluation a rule's own condition is checked
 * against: a rule only fires once its *most recent* N consecutive
 * checks (its own configured `consecutiveFailuresRequired`) have all
 * reached or worsened past the trigger status — never on a single
 * blip. Checks are expected newest-first; fewer checks than required
 * never fires (there isn't yet enough history to be confident it's a
 * real, sustained problem rather than one bad health-check cycle).
 */
export function evaluateAlertCondition(recentChecks: HealthCheckRecord[], triggerStatus: HealthStatus, consecutiveFailuresRequired: number): boolean {
  if (recentChecks.length < consecutiveFailuresRequired) return false;
  const severityRank: Record<HealthStatus, number> = { healthy: 0, degraded: 1, unhealthy: 2 };
  const mostRecent = recentChecks.slice(0, consecutiveFailuresRequired);
  return mostRecent.every((check) => severityRank[check.status] >= severityRank[triggerStatus]);
}
