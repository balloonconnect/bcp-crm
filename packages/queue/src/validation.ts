import { z } from "zod";

const queueKeyEnum = z.enum(["email", "whatsapp", "image-processing", "face-indexing", "ai-analysis", "pdf-generation", "import", "export", "webhooks", "notifications", "retention-cleanup", "subscription-expiry", "payment-reconciliation", "backup"]);

export const enqueueJobSchema = z.object({ queue: queueKeyEnum, jobName: z.string().min(1).max(100), payload: z.record(z.unknown()).optional(), idempotencyKey: z.string().max(300).optional() });
export const jobStatusFilterSchema = z.object({ queue: queueKeyEnum.optional(), status: z.string().optional() });
