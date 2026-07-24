import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

export async function listLeadCommunications(studioId: string, leadId: string) {
  return prisma.leadCommunication.findMany({ where: { studioId, leadId }, orderBy: { occurredAt: "desc" } });
}

export async function logLeadCommunication(
  studioId: string,
  leadId: string,
  input: { channel: string; direction: string; summary: string; occurredAt: string },
  actorId: string,
) {
  const communication = await prisma.leadCommunication.create({
    data: {
      studioId,
      leadId,
      channel: input.channel as never,
      direction: input.direction as never,
      summary: input.summary,
      occurredAt: new Date(input.occurredAt),
      createdBy: actorId,
    },
  });

  await recordActivity({ studioId, actorId, action: "lead.communication_logged", resourceType: "Lead", resourceId: leadId, metadata: { channel: input.channel } });

  return communication;
}
