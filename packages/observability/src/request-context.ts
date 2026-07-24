/**
 * "Request IDs" / "Studio IDs" / "User IDs" — the fields every
 * structured log line in `apps/api` carries once a request has been
 * authenticated, via a per-request child logger
 * (`apps/api/src/plugins/request-logging.ts`). Defined here as a
 * plain type so both the logging middleware and anything else that
 * needs to reason about "what identifies a request" share one shape.
 */
export interface RequestLogContext {
  requestId: string;
  studioId?: string;
  userId?: string;
}

/** A short, URL-safe request ID — not a full UUID, since this is purely a correlation identifier for log lines and error reports, not a database key needing UUID's collision guarantees at scale. */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
