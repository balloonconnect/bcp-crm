import { prisma } from "@bcp/database";
import webpush from "web-push";
import { getEnv } from "@bcp/config";

export async function listSubscriptions(studioId: string, studioUserId: string) {
  return prisma.pushSubscription.findMany({ where: { studioId, studioUserId } });
}

export async function registerSubscription(studioId: string, studioUserId: string, input: { endpoint: string; p256dhKey: string; authKey: string; userAgent?: string; isPwa?: boolean }) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { p256dhKey: input.p256dhKey, authKey: input.authKey, userAgent: input.userAgent, isPwa: input.isPwa ?? false },
    create: { studioId, studioUserId, ...input },
  });
}

export async function unregisterSubscription(studioId: string, studioUserId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { studioId, studioUserId, endpoint } });
}

let vapidConfigured: boolean | null = null;
function ensureVapidConfigured(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;
  const env = getEnv();
  vapidConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
  if (vapidConfigured) webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return vapidConfigured;
}

/**
 * Real Web Push delivery via VAPID — the "small addition on top" this
 * service's subscription storage was always built to support. Still
 * degrades honestly: with no VAPID keys configured, every subscription
 * is reported as attempted-but-not-delivered rather than silently
 * pretending to succeed. A subscription whose endpoint has gone stale
 * (the browser/device unsubscribed, a 404/410 from the push service)
 * is removed here rather than retried forever — the same "a bad
 * endpoint is a signal to clean up, not to keep hammering" instinct
 * this codebase already applies to bounced email addresses.
 */
export async function dispatchPush(studioId: string, studioUserId: string, payload: { title: string; body: string; url?: string }): Promise<{ attempted: number; delivered: number }> {
  const subscriptions = await listSubscriptions(studioId, studioUserId);
  if (!ensureVapidConfigured()) return { attempted: subscriptions.length, delivered: 0 };

  let delivered = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } }, JSON.stringify({ title: payload.title, body: payload.body, url: payload.url }));
      delivered += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
    }
  }

  return { attempted: subscriptions.length, delivered };
}
