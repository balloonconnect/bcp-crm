import { prisma } from "@bcp/database";

export type TimelineEntryType = "activity" | "note" | "communication";

export interface TimelineEntry {
  type: TimelineEntryType;
  id: string;
  occurredAt: Date;
  summary: string;
  detail?: string;
  actorId?: string | null;
}

/**
 * Merges three separate sources — `AuditLog` (status changes, creation,
 * assignment, conversions — anything `recordActivity()` logged), the
 * `LeadNote` thread, and logged `LeadCommunication` entries — into one
 * chronological feed. Deliberately not a fourth "LeadTimelineEvent"
 * table: the three sources already exist for their own reasons (audit
 * trail, notes thread, comms log), and duplicating them into a single
 * table would mean writing every event twice.
 */
export async function getLeadTimeline(studioId: string, leadId: string): Promise<TimelineEntry[]> {
  const [activity, notes, communications] = await Promise.all([
    prisma.auditLog.findMany({ where: { studioId, resourceType: "Lead", resourceId: leadId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.leadNote.findMany({ where: { studioId, leadId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.leadCommunication.findMany({ where: { studioId, leadId }, orderBy: { occurredAt: "desc" }, take: 50 }),
  ]);

  const entries: TimelineEntry[] = [
    ...activity.map((a: { id: string; createdAt: Date; action: string; metadata: unknown; actorId: string | null }) => ({
      type: "activity" as const,
      id: a.id,
      occurredAt: a.createdAt,
      summary: a.action.replace(/\./g, " ").replace(/_/g, " "),
      detail: a.metadata ? JSON.stringify(a.metadata) : undefined,
      actorId: a.actorId,
    })),
    ...notes.map((n: { id: string; createdAt: Date; body: string; createdBy: string | null }) => ({
      type: "note" as const,
      id: n.id,
      occurredAt: n.createdAt,
      summary: "Note added",
      detail: n.body,
      actorId: n.createdBy,
    })),
    ...communications.map((c: { id: string; occurredAt: Date; direction: string; channel: string; summary: string; createdBy: string | null }) => ({
      type: "communication" as const,
      id: c.id,
      occurredAt: c.occurredAt,
      summary: `${c.direction === "inbound" ? "Received" : "Sent"} ${c.channel}`,
      detail: c.summary,
      actorId: c.createdBy,
    })),
  ];

  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
