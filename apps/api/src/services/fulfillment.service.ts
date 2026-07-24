import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

// ── Deliveries ───────────────────────────────────────────────────────

export async function listDeliveries(studioId: string, eventId?: string) {
  return prisma.delivery.findMany({ where: { studioId, ...(eventId ? { eventId } : {}) }, orderBy: { createdAt: "desc" } });
}

export async function createDelivery(studioId: string, input: { eventId: string; method?: string; trackingInfo?: string }, actorId: string) {
  const delivery = await prisma.delivery.create({ data: { studioId, eventId: input.eventId, method: (input.method as never) ?? "digital_download", trackingInfo: input.trackingInfo } });
  await recordActivity({ studioId, actorId, action: "delivery.created", resourceType: "Delivery", resourceId: delivery.id, metadata: { eventId: input.eventId } });
  return delivery;
}

export async function updateDeliveryStatus(studioId: string, deliveryId: string, status: string, actorId: string) {
  const data: Record<string, unknown> = { status };
  if (status === "delivered") data.deliveredAt = new Date();
  await prisma.delivery.updateMany({ where: { id: deliveryId, studioId }, data });
  await recordActivity({ studioId, actorId, action: "delivery.status_changed", resourceType: "Delivery", resourceId: deliveryId, metadata: { status } });
  return prisma.delivery.findUnique({ where: { id: deliveryId } });
}
