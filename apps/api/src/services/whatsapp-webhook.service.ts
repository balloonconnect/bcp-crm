import { prisma } from "@bcp/database";

interface MetaStatusEntry {
  id: string; // wamid
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errors?: { title?: string; message?: string }[];
  recipient_id?: string;
}

interface MetaWebhookPayload {
  entry?: {
    changes?: { value?: { metadata?: { phone_number_id?: string }; statuses?: MetaStatusEntry[] } }[];
  }[];
}

/**
 * One platform-wide webhook endpoint receives every studio's delivery/
 * read/failure updates — Meta doesn't address webhooks per-tenant, so
 * each status update is matched back to a studio by its
 * `phone_number_id` against `WhatsAppConfig.phoneNumberId`, then to a
 * specific message by `providerMessageId` (Meta's wamid). Status only
 * ever moves forward here (sent → delivered → read, or → failed) —
 * this is the one place those fields are ever written, never from a
 * client-side guess.
 */
export async function handleStatusWebhook(payload: MetaWebhookPayload): Promise<{ processed: number }> {
  let processed = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const config = await prisma.whatsAppConfig.findFirst({ where: { phoneNumberId } });
      if (!config) continue;

      for (const status of change.value?.statuses ?? []) {
        const message = await prisma.whatsAppMessage.findFirst({ where: { studioId: config.studioId, providerMessageId: status.id } });
        if (!message) continue;

        const timestamp = new Date(Number(status.timestamp) * 1000);
        const data: Record<string, unknown> = { status: status.status };
        if (status.status === "sent") data.sentAt = timestamp;
        else if (status.status === "delivered") data.deliveredAt = timestamp;
        else if (status.status === "read") data.readAt = timestamp;
        else if (status.status === "failed") {
          data.failedAt = timestamp;
          data.failureReason = status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? "Delivery failed";
        }

        await prisma.whatsAppMessage.update({ where: { id: message.id }, data });
        processed += 1;
      }
    }
  }

  return { processed };
}

/** Meta's webhook verification handshake — echoes `hub.challenge` back only if `hub.verify_token` matches a configured studio's own token. */
export async function verifyWebhookChallenge(mode: string, token: string, challenge: string): Promise<string | null> {
  if (mode !== "subscribe") return null;
  const config = await prisma.whatsAppConfig.findFirst({ where: { webhookVerifyToken: token } });
  return config ? challenge : null;
}
