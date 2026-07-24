/**
 * "Idempotency" — a stable key derived from a job's own natural
 * identity (e.g. "send this exact email to this exact recipient
 * for this exact invoice") rather than a random ID, so enqueueing
 * the same logical job twice (a retried API call, a double-clicked
 * button, a webhook redelivery) is detectable before any duplicate
 * work happens. The caller (`apps/api`'s enqueue helpers) checks for
 * an existing `JobRecord` with the same key before creating a new
 * one; this function only builds the key deterministically.
 */
export function buildIdempotencyKey(queueKey: string, parts: (string | number)[]): string {
  return [queueKey, ...parts.map(String)].join(":");
}
