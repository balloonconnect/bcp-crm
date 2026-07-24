export interface SessionForRetention {
  createdAt: Date;
  retentionDays: number;
}

/** "Retention settings" — a `FaceSearchSession` record (never the selfie itself, which is deleted immediately after the search per the brief's strict rule) is purged after the gallery's configured retention window. Consent logs are explicitly never subject to this — see `FaceConsentLog`'s schema doc comment for why. */
export function isEligibleForPurge(session: SessionForRetention, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - session.createdAt.getTime();
  const retentionMs = session.retentionDays * 24 * 60 * 60 * 1000;
  return ageMs > retentionMs;
}
