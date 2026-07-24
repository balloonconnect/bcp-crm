import { z } from "zod";

export const notificationPreferenceInputSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  browserPushEnabled: z.boolean().optional(),
  pwaPushEnabled: z.boolean().optional(),
});

export const pushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  p256dhKey: z.string().min(1),
  authKey: z.string().min(1),
  userAgent: z.string().max(300).optional(),
  isPwa: z.boolean().optional(),
});

export const createNotificationInputSchema = z.object({
  recipientUserId: z.string().uuid(),
  channel: z.enum(["in_app", "email", "whatsapp", "browser_push", "pwa_push"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
});
