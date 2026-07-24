import { prisma } from "@bcp/database";
import { changeQuotationStatus } from "./quotations.service";
import { recordPayment } from "./invoices.service";
import { recordActivity } from "./activity-log.service";

/**
 * Every function here takes both `studioId` and `clientId` and filters
 * by both on every query — this is the one place in the codebase where
 * "scoped to a tenant" isn't enough; a client portal session must also
 * never surface a sibling client's bookings, invoices, or galleries
 * within the same studio. There's no shortcut function that queries by
 * `studioId` alone anywhere in this file.
 */

export async function getProfile(studioId: string, clientId: string) {
  return prisma.client.findFirstOrThrow({
    where: { id: clientId, studioId },
    select: { id: true, name: true, email: true, phone: true, brideName: true, groomName: true, billingAddressLine1: true, billingCity: true, billingState: true },
  });
}

export async function listBookings(studioId: string, clientId: string) {
  return prisma.booking.findMany({ where: { studioId, clientId }, orderBy: { createdAt: "desc" } });
}

export async function listEvents(studioId: string, clientId: string) {
  return prisma.event.findMany({ where: { studioId, clientId }, orderBy: { scheduledAt: "desc" } });
}

// ── Quotations ───────────────────────────────────────────────────────

export async function listQuotations(studioId: string, clientId: string) {
  return prisma.quotation.findMany({ where: { studioId, clientId }, orderBy: { createdAt: "desc" } });
}

export async function getQuotationForClient(studioId: string, clientId: string, quotationId: string) {
  return prisma.quotation.findFirstOrThrow({ where: { id: quotationId, studioId, clientId }, include: { lineItems: true } });
}

/** "Accept quotation" from within an authenticated portal session — the same status transition the public one-off approval link (Prompt 16) triggers, just reached through a logged-in client's own dashboard instead of a shared link. */
export async function acceptQuotation(studioId: string, clientId: string, quotationId: string) {
  const quotation = await prisma.quotation.findFirstOrThrow({ where: { id: quotationId, studioId, clientId } });
  return changeQuotationStatus(studioId, quotation.id, "accepted", clientId);
}

// ── Contracts ────────────────────────────────────────────────────────

export async function listContracts(studioId: string, clientId: string) {
  return prisma.clientContract.findMany({ where: { studioId, clientId }, orderBy: { createdAt: "desc" } });
}

/** "Sign contracts" — a typed full name plus a timestamp, the same lightweight signing mechanism this codebase uses in place of a captured signature image, consistent with the OTP-instead-of-password pattern everywhere else a guest-adjacent actor needs to affirmatively act without heavyweight infrastructure. */
export async function signContract(studioId: string, clientId: string, contractId: string, signedByName: string) {
  const contract = await prisma.clientContract.findFirstOrThrow({ where: { id: contractId, studioId, clientId } });
  if (contract.status === "signed") return contract;

  const updated = await prisma.clientContract.update({ where: { id: contractId }, data: { status: "signed", signedAt: new Date(), signedByName } });
  await recordActivity({ studioId, actorId: clientId, action: "contract.signed", resourceType: "ClientContract", resourceId: contractId, metadata: { signedByName } });
  return updated;
}

// ── Invoices, payments, receipts ────────────────────────────────────

export async function listInvoices(studioId: string, clientId: string) {
  return prisma.invoice.findMany({ where: { studioId, clientId }, include: { payments: { include: { receipt: true } } }, orderBy: { createdAt: "desc" } });
}

/** "Make payment" — a client self-reporting a payment they've made outside the portal (bank transfer, UPI to the studio's own account), landing as a normal `ClientPayment` a studio then confirms. This codebase has no live payment gateway wired up (an honest, documented gap since Prompt 23) — this is the realistic self-report flow that gap leaves in its place, not a simulated "success" that would misrepresent a real charge. */
export async function makePayment(studioId: string, clientId: string, invoiceId: string, input: { amount: number; method?: string; notes?: string }) {
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id: invoiceId, studioId, clientId } });
  return recordPayment(studioId, invoice.id, { amount: input.amount, method: input.method, notes: input.notes ? `${input.notes} (self-reported by client via portal)` : "Self-reported by client via portal" }, clientId);
}

/** "Download receipts" — every receipt across every one of the client's own invoices, not just one invoice at a time. */
export async function listReceipts(studioId: string, clientId: string) {
  return prisma.receipt.findMany({ where: { studioId, payment: { invoice: { clientId } } }, include: { payment: { select: { amount: true, invoiceId: true } } }, orderBy: { issuedAt: "desc" } });
}

// ── Galleries, selection, albums ─────────────────────────────────────

/** "View galleries" — every gallery for every event this client has, not requiring the client to already hold each gallery's own separate public link. */
export async function listGalleries(studioId: string, clientId: string) {
  const events = await prisma.event.findMany({ where: { studioId, clientId }, select: { id: true } });
  return prisma.gallery.findMany({ where: { studioId, eventId: { in: events.map((e: { id: string }) => e.id) } }, orderBy: { createdAt: "desc" } });
}

/** "View galleries" / "Select photos" / "Review album" / "Track printing" / "Track delivery" — the album's own public token and stage are surfaced here so the portal can deep-link into the existing selection (Prompt 31) and e-album/production (Prompt 32) experiences rather than rebuilding those flows a second time inside the authenticated portal. */
export async function listAlbums(studioId: string, clientId: string) {
  const events = await prisma.event.findMany({ where: { studioId, clientId }, select: { id: true } });
  const albums = await prisma.album.findMany({
    where: { studioId, eventId: { in: events.map((e: { id: string }) => e.id) } },
    include: { printOrders: { orderBy: { orderedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return albums.map((a: { id: string; publicToken: string; eAlbumToken: string | null; status: string; productionStage: string; printOrders: { status: string; courierName: string | null; trackingNumber: string | null; dispatchedAt: Date | null; deliveredAt: Date | null }[] }) => ({
    id: a.id,
    selectionLink: a.publicToken,
    eAlbumLink: a.eAlbumToken,
    status: a.status,
    productionStage: a.productionStage,
    printOrder: a.printOrders[0] ?? null,
  }));
}

// ── Support requests ─────────────────────────────────────────────────

export async function listSupportRequests(studioId: string, clientId: string) {
  return prisma.clientSupportRequest.findMany({ where: { studioId, clientId }, include: { replies: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } });
}

/** "Raise support request" */
export async function createSupportRequest(studioId: string, clientId: string, subject: string, message: string) {
  const request = await prisma.clientSupportRequest.create({ data: { studioId, clientId, subject, message } });
  await recordActivity({ studioId, actorId: clientId, action: "support_request.created", resourceType: "ClientSupportRequest", resourceId: request.id, metadata: { subject } });
  return request;
}

export async function addSupportRequestReply(studioId: string, clientId: string, supportRequestId: string, body: string) {
  const request = await prisma.clientSupportRequest.findFirstOrThrow({ where: { id: supportRequestId, studioId, clientId } });
  return prisma.clientSupportRequestReply.create({ data: { supportRequestId: request.id, body, authorType: "client" } });
}

/** A simplified snapshot for the mobile dashboard — the handful of numbers/next-actions a client actually wants at a glance, not the full detail every individual tab shows. */
export async function getDashboardSummary(studioId: string, clientId: string) {
  const [upcomingEvent, pendingQuotations, outstandingInvoices, openSupportRequests] = await Promise.all([
    prisma.event.findFirst({ where: { studioId, clientId, scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: "asc" } }),
    prisma.quotation.count({ where: { studioId, clientId, status: "sent" } }),
    prisma.invoice.count({ where: { studioId, clientId, status: { in: ["unpaid", "partially_paid", "overdue"] } } }),
    prisma.clientSupportRequest.count({ where: { studioId, clientId, status: { in: ["open", "in_progress"] } } }),
  ]);

  return { upcomingEvent, pendingQuotations, outstandingInvoices, openSupportRequests };
}
