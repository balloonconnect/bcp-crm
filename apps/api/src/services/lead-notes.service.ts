import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

export async function listLeadNotes(studioId: string, leadId: string) {
  return prisma.leadNote.findMany({ where: { studioId, leadId }, orderBy: { createdAt: "desc" } });
}

export async function addLeadNote(studioId: string, leadId: string, body: string, actorId: string) {
  const note = await prisma.leadNote.create({ data: { studioId, leadId, body, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "lead.note_added", resourceType: "Lead", resourceId: leadId });
  return note;
}
