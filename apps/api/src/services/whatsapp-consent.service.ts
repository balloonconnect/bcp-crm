import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

export async function listOptStatuses(studioId: string) {
  return prisma.whatsAppOptStatus.findMany({ where: { studioId }, orderBy: { updatedAt: "desc" } });
}

export async function getOptStatus(studioId: string, phone: string) {
  const record = await prisma.whatsAppOptStatus.findUnique({ where: { studioId_phone: { studioId, phone } } });
  return record?.status ?? "unknown";
}

export async function setOptStatus(studioId: string, phone: string, status: string, actorId: string) {
  const record = await prisma.whatsAppOptStatus.upsert({
    where: { studioId_phone: { studioId, phone } },
    update: { status: status as never },
    create: { studioId, phone, status: status as never },
  });
  await recordActivity({ studioId, actorId, action: "whatsapp_opt_status.changed", resourceType: "WhatsAppOptStatus", resourceId: record.id, metadata: { phone, status } });
  return record;
}
