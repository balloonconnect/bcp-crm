import { prisma } from "@bcp/database";
import type { NotificationChannelKey } from "@bcp/notifications";
import { resolveDispatchChannels } from "./notification-preferences.service";
import { sendEmail } from "./email-sender.service";
import { sendWhatsAppMessage } from "./whatsapp-sender.service";
import { dispatchPush } from "./push-subscriptions.service";

export async function listNotifications(studioId: string, studioUserId: string, filter?: { unreadOnly?: boolean }) {
  return prisma.notification.findMany({
    where: { studioId, recipientUserId: studioUserId, ...(filter?.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markAsRead(studioId: string, studioUserId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, studioId, recipientUserId: studioUserId }, data: { readAt: new Date(), status: "read" } });
}

export async function markAllAsRead(studioId: string, studioUserId: string) {
  await prisma.notification.updateMany({ where: { studioId, recipientUserId: studioUserId, readAt: null }, data: { readAt: new Date(), status: "read" } });
}

/**
 * Creates an in-app `Notification` row and — for whichever additional
 * channels this user has actually enabled (`resolveDispatchChannels()`)
 * — dispatches on those too via the same central `sendEmail()`/
 * `sendWhatsAppMessage()` paths every other feature already routes
 * through. `in_app` always gets its row regardless of preference (see
 * `@bcp/notifications`' reasoning); the other channels are best-effort
 * — a failed email/WhatsApp send here is logged by those services'
 * own tracking and never blocks the in-app notification from existing.
 */
export async function notifyUser(
  studioId: string,
  input: { recipientUserId: string; title: string; body: string; candidateChannels?: NotificationChannelKey[]; metadata?: Record<string, unknown>; emailTo?: string; whatsappTo?: string },
  actorId: string,
) {
  const inApp = await prisma.notification.create({
    data: { studioId, recipientUserId: input.recipientUserId, channel: "in_app", title: input.title, body: input.body, status: "sent", sentAt: new Date(), metadata: input.metadata },
  });

  const candidates = input.candidateChannels ?? ["in_app"];
  const dispatchChannels = await resolveDispatchChannels(studioId, input.recipientUserId, candidates);
  let pushDispatched = false;

  for (const channel of dispatchChannels) {
    if (channel === "in_app") continue;
    try {
      if (channel === "email" && input.emailTo) await sendEmail(studioId, { to: input.emailTo, subject: input.title, bodyHtml: `<p>${input.body}</p>` }, actorId);
      else if (channel === "whatsapp" && input.whatsappTo) await sendWhatsAppMessage(studioId, { to: input.whatsappTo, messageType: "text", body: `${input.title}: ${input.body}` }, actorId);
      else if ((channel === "browser_push" || channel === "pwa_push") && !pushDispatched) {
        await dispatchPush(studioId, input.recipientUserId, { title: input.title, body: input.body });
        pushDispatched = true; // browser_push and pwa_push both draw from the same stored subscriptions — sending once covers both, even if a user has enabled both preferences
      }
    } catch {
      // Best-effort — the channel's own service already tracked the failure (EmailMessage/WhatsAppMessage row); the in-app notification still stands regardless.
    }
  }

  return inApp;
}
