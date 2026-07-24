/**
 * The 14 background queues named in the brief, each tagged with its
 * own retry ceiling and base backoff — centralized here so producers
 * (`apps/api`) and consumers (`apps/worker`) share one source of
 * truth for what a queue is called and how it should retry, the same
 * "one registry, not scattered magic strings" pattern this codebase
 * already uses for report types, automation triggers, and marketing
 * content types. A queue whose work is genuinely not safe to retry
 * blindly (payment reconciliation, backups) gets a lower ceiling and
 * longer backoff than one that's cheap and safe to retry aggressively
 * (a single WhatsApp send).
 */
export const QUEUE_DEFINITIONS = [
  { key: "email", label: "Email", maxAttempts: 5, baseBackoffMs: 5_000 },
  { key: "whatsapp", label: "WhatsApp", maxAttempts: 5, baseBackoffMs: 5_000 },
  { key: "image-processing", label: "Image processing", maxAttempts: 3, baseBackoffMs: 10_000 },
  { key: "face-indexing", label: "Face indexing", maxAttempts: 3, baseBackoffMs: 15_000 },
  { key: "ai-analysis", label: "AI analysis", maxAttempts: 3, baseBackoffMs: 15_000 },
  { key: "pdf-generation", label: "PDF generation", maxAttempts: 3, baseBackoffMs: 10_000 },
  { key: "import", label: "Import", maxAttempts: 2, baseBackoffMs: 30_000 },
  { key: "export", label: "Export", maxAttempts: 2, baseBackoffMs: 30_000 },
  { key: "webhooks", label: "Webhooks", maxAttempts: 5, baseBackoffMs: 5_000 },
  { key: "notifications", label: "Notifications", maxAttempts: 5, baseBackoffMs: 5_000 },
  { key: "retention-cleanup", label: "Retention cleanup", maxAttempts: 2, baseBackoffMs: 60_000 },
  { key: "subscription-expiry", label: "Subscription expiry", maxAttempts: 3, baseBackoffMs: 30_000 },
  { key: "payment-reconciliation", label: "Payment reconciliation", maxAttempts: 2, baseBackoffMs: 60_000 },
  { key: "backup", label: "Backup", maxAttempts: 2, baseBackoffMs: 60_000 },
] as const;

export type QueueKey = (typeof QUEUE_DEFINITIONS)[number]["key"];

export function getQueueDefinition(key: string) {
  return QUEUE_DEFINITIONS.find((q) => q.key === key);
}
