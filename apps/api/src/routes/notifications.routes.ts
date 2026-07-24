import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { notificationPreferenceInputSchema, pushSubscriptionInputSchema } from "@bcp/notifications";
import * as notifications from "../services/notifications.service";
import * as preferences from "../services/notification-preferences.service";
import * as pushSubscriptions from "../services/push-subscriptions.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function notificationsRoutes(app: FastifyInstance) {
  const authed = [app.authenticate];

  // ── In-app notifications (always self-scoped — no special permission beyond being logged in) ──
  app.get("/notifications", { preHandler: authed }, async (request) => {
    const { unreadOnly } = z.object({ unreadOnly: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await notifications.listNotifications(request.auth!.studioId!, request.auth!.actorId, { unreadOnly }) };
  });

  app.post("/notifications/:id/read", { preHandler: authed }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await notifications.markAsRead(request.auth!.studioId!, request.auth!.actorId, id);
    return { ok: true, data: null };
  });

  app.post("/notifications/read-all", { preHandler: authed }, async (request) => {
    await notifications.markAllAsRead(request.auth!.studioId!, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Notification preferences — one row per user, always self-scoped ──
  app.get("/notifications/preferences", { preHandler: authed }, async (request) => ({ ok: true, data: await preferences.getPreferences(request.auth!.studioId!, request.auth!.actorId) }));

  app.put("/notifications/preferences", { preHandler: authed }, async (request) => {
    const body = notificationPreferenceInputSchema.parse(request.body);
    return { ok: true, data: await preferences.updatePreferences(request.auth!.studioId!, request.auth!.actorId, body) };
  });

  // ── Push subscriptions ───────────────────────────────────────────────
  app.get("/notifications/push-subscriptions", { preHandler: authed }, async (request) => ({ ok: true, data: await pushSubscriptions.listSubscriptions(request.auth!.studioId!, request.auth!.actorId) }));

  app.post("/notifications/push-subscriptions", { preHandler: authed }, async (request) => {
    const body = pushSubscriptionInputSchema.parse(request.body);
    return { ok: true, data: await pushSubscriptions.registerSubscription(request.auth!.studioId!, request.auth!.actorId, body) };
  });

  app.delete("/notifications/push-subscriptions", { preHandler: authed }, async (request) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(request.body);
    await pushSubscriptions.unregisterSubscription(request.auth!.studioId!, request.auth!.actorId, endpoint);
    return { ok: true, data: null };
  });
}
