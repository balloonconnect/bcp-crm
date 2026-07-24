export interface RecentSessionSummary {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * "Suspicious-login alerts" — a deliberately simple heuristic: a login
 * is flagged when neither its IP address nor its user agent matches
 * any of the account's recent sessions. Matching on *either* means a
 * traveling user on a known device, or a known network on a new
 * device, is never falsely flagged — only a login that's new on both
 * axes at once, which is what actually warrants surfacing to the
 * account holder rather than silently logging.
 */
export function isSuspiciousLogin(newIpAddress: string | null, newUserAgent: string | null, recentSessions: RecentSessionSummary[]): boolean {
  if (recentSessions.length === 0) return false; // a first-ever login has nothing to compare against — not suspicious, just new

  const knownIp = recentSessions.some((s) => s.ipAddress && s.ipAddress === newIpAddress);
  const knownUserAgent = recentSessions.some((s) => s.userAgent && s.userAgent === newUserAgent);
  return !knownIp && !knownUserAgent;
}
