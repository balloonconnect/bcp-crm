import { z } from "zod";

const monitoredServiceEnum = z.enum(["api", "database", "redis", "storage", "ai_provider", "whatsapp", "payment_provider", "queue"]);
const healthStatusEnum = z.enum(["healthy", "degraded", "unhealthy"]);

export const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(200),
  service: monitoredServiceEnum,
  triggerStatus: healthStatusEnum,
  consecutiveFailuresRequired: z.number().int().positive().max(20).optional(),
  notifyEmails: z.array(z.string().email()).max(20).optional(),
});
export const updateAlertRuleSchema = createAlertRuleSchema.partial();

export const createIncidentSchema = z.object({
  title: z.string().min(1).max(300),
  severity: z.enum(["sev1", "sev2", "sev3"]),
  affectedServices: z.array(monitoredServiceEnum).min(1),
  message: z.string().min(1).max(2000),
});

export const postIncidentUpdateSchema = z.object({
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  message: z.string().min(1).max(2000),
});
