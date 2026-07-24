import { prisma } from "@bcp/database";
import { getCurrentUsage, resolveStudioPlanLimits } from "./plan-limit-enforcement";

export async function listMessages(studioId: string, filter?: { status?: string; toPhone?: string; contextType?: string; contextId?: string }) {
  return prisma.whatsAppMessage.findMany({
    where: {
      studioId,
      ...(filter?.status ? { status: filter.status as never } : {}),
      ...(filter?.toPhone ? { toPhone: filter.toPhone } : {}),
      ...(filter?.contextType ? { contextType: filter.contextType } : {}),
      ...(filter?.contextId ? { contextId: filter.contextId } : {}),
    },
    include: { template: { select: { name: true } } },
    orderBy: { queuedAt: "desc" },
    take: 200,
  });
}

export async function getMessage(studioId: string, messageId: string) {
  return prisma.whatsAppMessage.findFirst({ where: { id: messageId, studioId } });
}

/** "Usage tracking" — this month's message count against the plan's `maxWhatsappMessagesPerMonth` limit, reusing the exact same usage-accounting infrastructure every other metered dimension in the platform already goes through (Prompt 6). */
export async function getWhatsAppUsage(studioId: string) {
  const [used, limits] = await Promise.all([getCurrentUsage(studioId, "maxWhatsappMessagesPerMonth"), resolveStudioPlanLimits(studioId)]);
  return { used, limit: limits.maxWhatsappMessagesPerMonth };
}
