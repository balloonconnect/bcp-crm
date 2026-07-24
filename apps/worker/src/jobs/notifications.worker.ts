import { Worker, type Job } from "bullmq";
import webpush from "web-push";
import { prisma } from "@bcp/database";
import { getEnv } from "@bcp/config";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface NotificationJobData {
  jobRecordId: string;
  studioId: string | null;
  recipientUserId: string;
  title: string;
  body: string;
}

const env = getEnv();
let vapidConfigured = false;
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

/**
 * Background push-notification fan-out — decouples "send a push to
 * every device this person has installed the PWA on" (potentially
 * several deliveries) from the request that triggered the
 * notification, the same way any multi-recipient send benefits from
 * moving off the request thread. A subscription whose endpoint has
 * gone stale (404/410) is cleaned up here rather than retried by the
 * queue forever.
 */
export const notificationsWorker = new Worker<NotificationJobData>(
  "notifications",
  (job: Job<NotificationJobData>) =>
    withJobTracking("notifications", job, async () => {
      if (!vapidConfigured) return { delivered: 0, reason: "VAPID not configured" };

      const subscriptions = await prisma.pushSubscription.findMany({ where: { studioId: job.data.studioId ?? undefined, studioUserId: job.data.recipientUserId } });
      let delivered = 0;
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } }, JSON.stringify({ title: job.data.title, body: job.data.body }));
          delivered += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
      return { attempted: subscriptions.length, delivered };
    }),
  { connection },
);
