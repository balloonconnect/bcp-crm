import { prisma } from "@bcp/database";
import { findDuplicates, type ExistingLeadForMatching } from "@bcp/leads";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { recordActivity } from "./activity-log.service";

export class LeadNotFoundError extends Error {
  readonly code = "LEAD_NOT_FOUND";
  constructor() {
    super("Lead not found");
    this.name = "LeadNotFoundError";
  }
}

export interface LeadListFilter {
  status?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  from?: Date; // by eventDate — for the calendar view
  to?: Date;
}

export async function listLeads(studioId: string, filter: LeadListFilter = {}) {
  return prisma.lead.findMany({
    where: {
      studioId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(filter.priority ? { priority: filter.priority as never } : {}),
      ...(filter.assignedTo ? { assignedTo: filter.assignedTo } : {}),
      ...(filter.from || filter.to ? { eventDate: { gte: filter.from, lte: filter.to } } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { phone: { contains: filter.search } },
              { email: { contains: filter.search, mode: "insensitive" } },
              { brideName: { contains: filter.search, mode: "insensitive" } },
              { groomName: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLead(studioId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, studioId, deletedAt: null } });
  if (!lead) throw new LeadNotFoundError();
  return lead;
}

// ── Duplicate detection ──────────────────────────────────────────────

export interface DuplicateCheckInput {
  phone?: string;
  alternateMobile?: string;
  email?: string;
  instagramProfile1?: string;
  instagramProfile2?: string;
}

/**
 * Only fetches leads that could plausibly match (same phone or email)
 * rather than pulling a studio's entire lead list into memory — the
 * actual fuzzy/normalized comparison happens in `@bcp/leads`'s pure
 * `findDuplicates()`, which this hands the candidates to.
 */
export async function checkForDuplicates(studioId: string, input: DuplicateCheckInput) {
  const orConditions = [];
  if (input.phone) orConditions.push({ phone: input.phone }, { alternateMobile: input.phone });
  if (input.alternateMobile) orConditions.push({ phone: input.alternateMobile }, { alternateMobile: input.alternateMobile });
  if (input.email) orConditions.push({ email: input.email });

  if (orConditions.length === 0) return [];

  const candidates = await prisma.lead.findMany({
    where: { studioId, deletedAt: null, OR: orConditions },
    select: { id: true, name: true, phone: true, alternateMobile: true, email: true, instagramProfile1: true, instagramProfile2: true },
    take: 25,
  });

  return findDuplicates(input, candidates as ExistingLeadForMatching[]);
}

// ── Create / update ──────────────────────────────────────────────────

export interface LeadInput {
  branchId?: string;
  name: string;
  brideName?: string;
  groomName?: string;
  phone?: string;
  alternateMobile?: string;
  email?: string;
  instagramProfile1?: string;
  instagramProfile2?: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  city?: string;
  source?: string;
  budget?: number;
  interestedPackage?: string;
  notes?: string;
  assignedTo?: string;
  priority?: string;
  followUpAt?: string;
  expectedValue?: number;
  winProbability?: number;
}

function toLeadData(input: LeadInput) {
  return {
    branchId: input.branchId,
    name: input.name,
    brideName: input.brideName,
    groomName: input.groomName,
    phone: input.phone,
    alternateMobile: input.alternateMobile,
    email: input.email,
    instagramProfile1: input.instagramProfile1,
    instagramProfile2: input.instagramProfile2,
    eventType: input.eventType,
    eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
    venue: input.venue,
    city: input.city,
    source: input.source as never,
    budget: input.budget,
    interestedPackage: input.interestedPackage,
    notes: input.notes,
    assignedTo: input.assignedTo,
    priority: input.priority as never,
    followUpAt: input.followUpAt ? new Date(input.followUpAt) : undefined,
    expectedValue: input.expectedValue,
    winProbability: input.winProbability,
  };
}

export async function createLead(studioId: string, input: LeadInput, actorId: string) {
  await assertWithinPlanLimit(studioId, "maxLeads");

  const lead = await prisma.lead.create({ data: { studioId, ...toLeadData(input), createdBy: actorId } });

  await recordActivity({ studioId, actorId, action: "lead.created", resourceType: "Lead", resourceId: lead.id, metadata: { name: lead.name } });

  return lead;
}

export async function updateLead(studioId: string, leadId: string, input: Partial<LeadInput>, actorId: string) {
  const existing = await prisma.lead.findFirst({ where: { id: leadId, studioId, deletedAt: null } });
  if (!existing) throw new LeadNotFoundError();

  await prisma.lead.updateMany({ where: { id: leadId, studioId }, data: toLeadData(input as LeadInput) });
  await recordActivity({ studioId, actorId, action: "lead.updated", resourceType: "Lead", resourceId: leadId });

  return prisma.lead.findUnique({ where: { id: leadId } });
}

export async function updateLeadStatus(studioId: string, leadId: string, status: string, actorId: string, lostReason?: string) {
  const data: Record<string, unknown> = { status };
  if (status === "lost" && lostReason) data.lostReason = lostReason;

  await prisma.lead.updateMany({ where: { id: leadId, studioId }, data });
  await recordActivity({ studioId, actorId, action: "lead.status_changed", resourceType: "Lead", resourceId: leadId, metadata: { status, lostReason } });

  return prisma.lead.findUnique({ where: { id: leadId } });
}

// ── Bulk actions ─────────────────────────────────────────────────────

export async function bulkAssign(studioId: string, leadIds: string[], assignedTo: string, actorId: string) {
  const result = await prisma.lead.updateMany({ where: { id: { in: leadIds }, studioId }, data: { assignedTo } });
  await recordActivity({ studioId, actorId, action: "lead.bulk_assigned", resourceType: "Lead", resourceId: leadIds.join(","), metadata: { count: result.count, assignedTo } });
  return result;
}

export async function bulkUpdateStatus(studioId: string, leadIds: string[], status: string, actorId: string) {
  const result = await prisma.lead.updateMany({ where: { id: { in: leadIds }, studioId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "lead.bulk_status_changed", resourceType: "Lead", resourceId: leadIds.join(","), metadata: { count: result.count, status } });
  return result;
}

// ── Conversion to client ─────────────────────────────────────────────

export async function convertLeadToClient(studioId: string, leadId: string, actorId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, studioId, deletedAt: null } });
  if (!lead) throw new LeadNotFoundError();

  const client = await prisma.$transaction(async (tx: typeof prisma) => {
    const created = await tx.client.create({
      data: { studioId, name: lead.name, email: lead.email, phone: lead.phone, source: "lead_conversion", createdBy: actorId },
    });
    await tx.lead.update({ where: { id: leadId }, data: { status: "won", convertedClientId: created.id, convertedAt: new Date() } });
    return created;
  });

  await recordActivity({ studioId, actorId, action: "lead.converted", resourceType: "Lead", resourceId: leadId, metadata: { clientId: client.id } });

  return client;
}
