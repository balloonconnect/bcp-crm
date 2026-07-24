import { prisma } from "@bcp/database";
import { computeLifetimeValue, computeOutstandingAmount, computeRelationshipScore, buildClientSummary, recommendNextAction } from "@bcp/clients";
import { generateOpaqueToken } from "@bcp/auth";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { recordActivity } from "./activity-log.service";

export interface ImportableCustomer {
  name: string;
  email?: string;
  phone?: string;
}

export class ClientNotFoundError extends Error {
  readonly code = "CLIENT_NOT_FOUND";
  constructor() {
    super("Client not found");
    this.name = "ClientNotFoundError";
  }
}

export async function createClient(input: { studioId: string; name: string; email?: string; phone?: string; notes?: string; actorId: string }) {
  await assertWithinPlanLimit(input.studioId, "maxClients");

  const client = await prisma.client.create({
    data: { studioId: input.studioId, name: input.name, email: input.email, phone: input.phone, notes: input.notes, source: "manual", createdBy: input.actorId },
  });

  await recordActivity({ studioId: input.studioId, actorId: input.actorId, action: "client.created", resourceType: "Client", resourceId: client.id, metadata: { name: client.name } });

  return client;
}

/**
 * Bulk-creates Client rows (the onboarding wizard's "Customer import"
 * step, and the general customer-import feature it doubles as). Enforces
 * `maxClients` against the *projected* total (current + this batch) up
 * front, so an import either fully succeeds or fails clearly — not a
 * partial import that silently stops partway through a plan's limit.
 */
export async function importCustomers(studioId: string, customers: ImportableCustomer[], actorId: string) {
  await assertWithinPlanLimit(studioId, "maxClients", customers.length);

  const created = await prisma.client.createMany({
    data: customers.map((c) => ({
      studioId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      source: "import",
      createdBy: actorId,
    })),
  });

  return { imported: created.count };
}

export async function listClients(studioId: string) {
  return prisma.client.findMany({ where: { studioId, deletedAt: null }, orderBy: { createdAt: "desc" } });
}

export async function getClient(studioId: string, clientId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, studioId, deletedAt: null } });
  if (!client) throw new ClientNotFoundError();
  return client;
}

export type ClientProfileInput = Partial<{
  name: string; brideName: string; groomName: string; email: string; phone: string; notes: string;
  instagramProfile1: string; instagramProfile2: string; facebookProfile: string;
  billingAddressLine1: string; billingAddressLine2: string; billingCity: string; billingState: string; billingPostalCode: string; billingCountry: string;
  shippingSameAsBilling: boolean; shippingAddressLine1: string; shippingAddressLine2: string; shippingCity: string; shippingState: string; shippingPostalCode: string; shippingCountry: string;
  gstin: string; gstLegalName: string;
  anniversaryDate: string; brideBirthday: string; groomBirthday: string; otherImportantDates: { label: string; date: string }[];
  tags: string[]; referredById: string; referralNotes: string;
}>;

function toDateFields(input: ClientProfileInput) {
  return {
    ...input,
    anniversaryDate: input.anniversaryDate ? new Date(input.anniversaryDate) : undefined,
    brideBirthday: input.brideBirthday ? new Date(input.brideBirthday) : undefined,
    groomBirthday: input.groomBirthday ? new Date(input.groomBirthday) : undefined,
    otherImportantDates: input.otherImportantDates as never,
  };
}

export async function updateClient(studioId: string, clientId: string, input: ClientProfileInput, actorId: string) {
  const existing = await prisma.client.findFirst({ where: { id: clientId, studioId, deletedAt: null } });
  if (!existing) throw new ClientNotFoundError();

  await prisma.client.updateMany({ where: { id: clientId, studioId }, data: toDateFields(input) });
  await recordActivity({ studioId, actorId, action: "client.updated", resourceType: "Client", resourceId: clientId });

  return prisma.client.findUnique({ where: { id: clientId } });
}

// ── Financials, relationship score, AI summary/next-action ──────────────

async function getClientInvoices(studioId: string, clientId: string) {
  return prisma.invoice.findMany({ where: { studioId, clientId }, select: { totalAmount: true, amountPaid: true, status: true } });
}

export async function getClientFinancials(studioId: string, clientId: string) {
  const invoices = await getClientInvoices(studioId, clientId);
  return { lifetimeValue: computeLifetimeValue(invoices), outstandingAmount: computeOutstandingAmount(invoices) };
}

export async function getClientRelationshipScore(studioId: string, clientId: string) {
  const [completedEventsCount, overdueInvoiceCount, feedbackAgg, lastCommunication, referralsGivenCount, client] = await Promise.all([
    prisma.event.count({ where: { studioId, clientId, status: "completed" } }),
    prisma.invoice.count({ where: { studioId, clientId, status: "overdue" } }),
    prisma.clientFeedback.aggregate({ where: { studioId, clientId }, _avg: { rating: true } }),
    prisma.clientCommunication.findFirst({ where: { studioId, clientId }, orderBy: { occurredAt: "desc" } }),
    prisma.client.count({ where: { studioId, referredById: clientId, deletedAt: null } }),
    prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { createdAt: true } }),
  ]);

  const daysSinceLastCommunication = lastCommunication ? Math.floor((Date.now() - lastCommunication.occurredAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const tenureDays = Math.floor((Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return computeRelationshipScore({
    completedEventsCount,
    hasOverdueInvoice: overdueInvoiceCount > 0,
    averageFeedbackRating: feedbackAgg._avg.rating,
    daysSinceLastCommunication,
    referralsGivenCount,
    tenureDays,
  });
}

export async function getClientAiInsights(studioId: string, clientId: string) {
  const [client, financials, completedEventsCount, upcomingEventsCount, pendingQuotationCount, overdueInvoiceCount, galleryPendingCount, lastCommunication, relationshipScoreResult] =
    await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { name: true } }),
      getClientFinancials(studioId, clientId),
      prisma.event.count({ where: { studioId, clientId, status: "completed" } }),
      prisma.event.count({ where: { studioId, clientId, status: "confirmed", scheduledAt: { gte: new Date() } } }),
      prisma.quotation.findFirst({ where: { studioId, clientId, status: "sent" } }),
      prisma.invoice.count({ where: { studioId, clientId, status: "overdue" } }),
      prisma.gallery.findFirst({ where: { studioId, status: "uploaded", event: { clientId } } }),
      prisma.clientCommunication.findFirst({ where: { studioId, clientId }, orderBy: { occurredAt: "desc" } }),
      getClientRelationshipScore(studioId, clientId),
    ]);

  const daysSinceLastCommunication = lastCommunication ? Math.floor((Date.now() - lastCommunication.occurredAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const upcomingEventInNext7Days = await prisma.event.count({
    where: { studioId, clientId, status: "confirmed", scheduledAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
  });

  const summary = buildClientSummary({
    name: client.name,
    completedEventsCount,
    upcomingEventsCount,
    lifetimeValue: financials.lifetimeValue,
    outstandingAmount: financials.outstandingAmount,
    relationshipScore: relationshipScoreResult.score,
    lastCommunicationDaysAgo: daysSinceLastCommunication,
  });

  const nextAction = recommendNextAction({
    hasOverdueInvoice: overdueInvoiceCount > 0,
    hasPendingQuotation: Boolean(pendingQuotationCount),
    upcomingEventInNext7Days: upcomingEventInNext7Days > 0,
    galleryPendingDelivery: Boolean(galleryPendingCount),
    lastCommunicationDaysAgo: daysSinceLastCommunication,
  });

  return { summary, nextAction, relationshipScore: relationshipScoreResult };
}

export async function getReferralHistory(studioId: string, clientId: string) {
  return prisma.client.findMany({ where: { studioId, referredById: clientId, deletedAt: null }, select: { id: true, name: true, createdAt: true } });
}

// ── Client portal access ─────────────────────────────────────────────

export async function enablePortalAccess(studioId: string, clientId: string, actorId: string) {
  const token = generateOpaqueToken(24);
  await prisma.client.updateMany({ where: { id: clientId, studioId }, data: { portalAccessEnabled: true, portalInviteToken: token, portalInvitedAt: new Date() } });
  await recordActivity({ studioId, actorId, action: "client.portal_access_enabled", resourceType: "Client", resourceId: clientId });
  return prisma.client.findUnique({ where: { id: clientId }, select: { portalInviteToken: true } });
}

export async function disablePortalAccess(studioId: string, clientId: string, actorId: string) {
  await prisma.client.updateMany({ where: { id: clientId, studioId }, data: { portalAccessEnabled: false, portalInviteToken: null } });
  await recordActivity({ studioId, actorId, action: "client.portal_access_disabled", resourceType: "Client", resourceId: clientId });
}
