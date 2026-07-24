import { prisma } from "@bcp/database";

export async function listNotes(studioId: string, entityType: string, entityId: string) {
  return prisma.note.findMany({ where: { studioId, entityType, entityId }, orderBy: { createdAt: "desc" } });
}

/** The one write path behind the PWA's "Add notes" offline-queueable action — deliberately just an insert, no update/delete, so replaying a queued note twice (a real possibility with any offline sync) only ever creates a harmless duplicate row. */
export async function createNote(studioId: string, input: { entityType: string; entityId: string; content: string }, actorId: string) {
  return prisma.note.create({ data: { studioId, entityType: input.entityType, entityId: input.entityId, content: input.content, createdBy: actorId } });
}
