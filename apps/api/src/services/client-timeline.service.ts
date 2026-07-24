import { prisma } from "@bcp/database";
import type { TimelineEventType } from "@bcp/clients";

export interface ClientTimelineEntry {
  type: TimelineEventType;
  id: string;
  occurredAt: Date;
  summary: string;
  detail?: string;
}

const COMMUNICATION_CHANNEL_TO_TYPE: Record<string, TimelineEventType> = {
  call: "call",
  meeting: "meeting",
  email: "message",
  whatsapp: "message",
  sms: "message",
  other: "message",
};

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Aggregates the 15 timeline entry types across every source that
 * already exists for its own reason (leads, communications, quotations,
 * events, contracts, invoices, payments, galleries, albums, print
 * orders, deliveries, feedback) into one chronological feed — same
 * "compose from real tables, don't duplicate into a new one" approach
 * as `getLeadTimeline` (apps/api's lead-timeline.service.ts). A booking
 * and an event are drawn from the *same* `Event` row at two different
 * moments: `createdAt` (when it was booked) and `scheduledAt` (when the
 * shoot actually happens) — not two separate records.
 */
export async function getClientTimeline(studioId: string, clientId: string): Promise<ClientTimelineEntry[]> {
  const [leads, communications, quotations, events, contracts, invoices, payments, galleries, albums, printOrders, deliveries, feedback] = await Promise.all([
    prisma.lead.findMany({ where: { studioId, convertedClientId: clientId }, take: 20 }),
    prisma.clientCommunication.findMany({ where: { studioId, clientId }, take: 100 }),
    prisma.quotation.findMany({ where: { studioId, clientId }, take: 50 }),
    prisma.event.findMany({ where: { studioId, clientId, deletedAt: null }, take: 50 }),
    prisma.clientContract.findMany({ where: { studioId, clientId }, take: 50 }),
    prisma.invoice.findMany({ where: { studioId, clientId }, take: 50 }),
    prisma.clientPayment.findMany({ where: { studioId, invoice: { clientId } }, take: 100 }),
    prisma.gallery.findMany({ where: { studioId, event: { clientId } }, take: 50 }),
    prisma.album.findMany({ where: { studioId, event: { clientId } }, take: 50 }),
    prisma.printOrder.findMany({ where: { studioId, album: { event: { clientId } } }, take: 50 }),
    prisma.delivery.findMany({ where: { studioId, event: { clientId } }, take: 50 }),
    prisma.clientFeedback.findMany({ where: { studioId, clientId }, take: 50 }),
  ]);

  const entries: ClientTimelineEntry[] = [];

  for (const l of leads as Array<{ id: string; createdAt: Date; name: string }>) {
    entries.push({ type: "enquiry", id: l.id, occurredAt: l.createdAt, summary: "Enquiry received", detail: l.name });
  }

  for (const c of communications as Array<{ id: string; occurredAt: Date; channel: string; direction: string; summary: string }>) {
    entries.push({
      type: COMMUNICATION_CHANNEL_TO_TYPE[c.channel] ?? "message",
      id: c.id,
      occurredAt: c.occurredAt,
      summary: `${c.direction === "inbound" ? "Received" : "Sent"} ${c.channel}`,
      detail: c.summary,
    });
  }

  for (const q of quotations as Array<{ id: string; createdAt: Date; quotationNumber: string; totalAmount: number }>) {
    entries.push({ type: "quotation", id: q.id, occurredAt: q.createdAt, summary: `Quotation ${q.quotationNumber}`, detail: formatRupees(q.totalAmount) });
  }

  for (const e of events as Array<{ id: string; createdAt: Date; scheduledAt: Date; title: string; status: string }>) {
    entries.push({ type: "booking", id: `${e.id}-booking`, occurredAt: e.createdAt, summary: `Booked: ${e.title}` });
    entries.push({ type: "event", id: `${e.id}-event`, occurredAt: e.scheduledAt, summary: e.title, detail: e.status });
  }

  for (const c of contracts as Array<{ id: string; createdAt: Date; title: string; status: string }>) {
    entries.push({ type: "contract", id: c.id, occurredAt: c.createdAt, summary: c.title, detail: c.status });
  }

  for (const i of invoices as Array<{ id: string; createdAt: Date; invoiceNumber: string; totalAmount: number }>) {
    entries.push({ type: "invoice", id: i.id, occurredAt: i.createdAt, summary: `Invoice ${i.invoiceNumber}`, detail: formatRupees(i.totalAmount) });
  }

  for (const p of payments as Array<{ id: string; createdAt: Date; amount: number; method: string }>) {
    entries.push({ type: "payment", id: p.id, occurredAt: p.createdAt, summary: "Payment received", detail: `${formatRupees(p.amount)} via ${p.method}` });
  }

  for (const g of galleries as Array<{ id: string; createdAt: Date; photoCount: number; status: string }>) {
    entries.push({ type: "gallery", id: g.id, occurredAt: g.createdAt, summary: `Gallery — ${g.photoCount} photos`, detail: g.status });
  }

  for (const a of albums as Array<{ id: string; createdAt: Date; status: string }>) {
    entries.push({ type: "album_selection", id: a.id, occurredAt: a.createdAt, summary: "Album", detail: a.status });
  }

  for (const p of printOrders as Array<{ id: string; orderedAt: Date; status: string; copies: number }>) {
    entries.push({ type: "print_order", id: p.id, occurredAt: p.orderedAt, summary: `Print order — ${p.copies} cop${p.copies === 1 ? "y" : "ies"}`, detail: p.status });
  }

  for (const d of deliveries as Array<{ id: string; createdAt: Date; method: string; status: string }>) {
    entries.push({ type: "delivery", id: d.id, occurredAt: d.createdAt, summary: `Delivery via ${d.method}`, detail: d.status });
  }

  for (const f of feedback as Array<{ id: string; createdAt: Date; rating: number; comment: string | null }>) {
    entries.push({ type: "feedback", id: f.id, occurredAt: f.createdAt, summary: `Feedback: ${f.rating}/5`, detail: f.comment ?? undefined });
  }

  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
