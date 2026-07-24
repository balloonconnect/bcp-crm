export interface UptimeCheck {
  status: "healthy" | "degraded" | "unhealthy";
}

/** "Service uptime tracking" — the percentage of checks in a window that were genuinely `healthy`; `degraded` counts as down for uptime purposes (a service technically responding but degraded isn't "up" in the sense a studio or a status-page visitor cares about), matching how most public status pages define uptime. Returns 100 for an empty window rather than dividing by zero or claiming an outage with no evidence either way. */
export function computeUptimePercent(checks: UptimeCheck[]): number {
  if (checks.length === 0) return 100;
  const healthyCount = checks.filter((c) => c.status === "healthy").length;
  return Math.round((healthyCount / checks.length) * 10000) / 100; // 2 decimal places
}
