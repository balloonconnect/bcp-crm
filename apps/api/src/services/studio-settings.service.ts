import { prisma } from "@bcp/database";

/**
 * Generic key/value studio settings — backs several onboarding steps
 * (business info, GST, bank details, UPI, services/packages catalog v1,
 * payment gateway connection) that don't yet have a dedicated relational
 * model. See packages/onboarding/docs/onboarding.md § "Staged vs. live
 * steps" for which steps use this vs. a real table.
 */
export async function setStudioSetting(studioId: string, key: string, value: unknown, actorId: string) {
  return prisma.studioSetting.upsert({
    where: { studioId_key: { studioId, key } },
    update: { value: value as never, updatedBy: actorId },
    create: { studioId, key, value: value as never, updatedBy: actorId },
  });
}

export async function getStudioSetting(studioId: string, key: string) {
  return prisma.studioSetting.findUnique({ where: { studioId_key: { studioId, key } } });
}

export async function listStudioSettings(studioId: string) {
  return prisma.studioSetting.findMany({ where: { studioId } });
}
