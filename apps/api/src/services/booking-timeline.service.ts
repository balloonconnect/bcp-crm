import { prisma } from "@bcp/database";
import type { BookingTimelineEventType } from "@bcp/bookings";

export interface BookingTimelineEntry {
  type: BookingTimelineEventType;
  id: string;
  occurredAt: Date;
  summary: string;
  detail?: string;
}

/**
 * The "visual booking timeline" data source — aggregates the booking's
 * own audit history plus everything that happens across its events
 * (shoot dates, galleries, albums, print orders, deliveries) and any
 * linked contract into one chronological feed, same "compose from
 * tables that already exist" approach as the lead and client timelines.
 * Payments aren't included directly (a booking has no direct invoice
 * link — invoices attach to clients/events) to avoid double-counting
 * across a booking's several events; the booking's own payment
 * *schedule* (the plan) is a separate, already-visible part of the
 * booking record, not part of this history feed.
 */
export async function getBookingTimeline(studioId: string, bookingId: string): Promise<BookingTimelineEntry[]> {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, studioId }, select: { createdAt: true, bookingNumber: true, contractId: true, events: { select: { id: true } } } });
  if (!booking) return [];

  const eventIds = booking.events.map((e: { id: string }) => e.id);

  const [activity, events, galleries, albums, printOrders, deliveries, contract] = await Promise.all([
    prisma.auditLog.findMany({ where: { studioId, resourceType: "Booking", resourceId: bookingId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.event.findMany({ where: { studioId, id: { in: eventIds } }, select: { id: true, title: true, status: true, scheduledAt: true } }),
    eventIds.length ? prisma.gallery.findMany({ where: { studioId, eventId: { in: eventIds } } }) : Promise.resolve([]),
    eventIds.length ? prisma.album.findMany({ where: { studioId, eventId: { in: eventIds } } }) : Promise.resolve([]),
    eventIds.length ? prisma.printOrder.findMany({ where: { studioId, album: { eventId: { in: eventIds } } } }) : Promise.resolve([]),
    eventIds.length ? prisma.delivery.findMany({ where: { studioId, eventId: { in: eventIds } } }) : Promise.resolve([]),
    booking.contractId ? prisma.clientContract.findUnique({ where: { id: booking.contractId } }) : Promise.resolve(null),
  ]);

  const entries: BookingTimelineEntry[] = [{ type: "booking_created", id: bookingId, occurredAt: booking.createdAt, summary: `Booking ${booking.bookingNumber} created` }];

  for (const a of activity as Array<{ id: string; createdAt: Date; action: string; metadata: unknown }>) {
    if (a.action === "booking.status_changed") {
      const status = (a.metadata as { status?: string } | null)?.status ?? "";
      entries.push({ type: "status_change", id: a.id, occurredAt: a.createdAt, summary: `Status changed to ${status.replace(/_/g, " ")}` });
    }
  }

  for (const e of events as Array<{ id: string; title: string; status: string; scheduledAt: Date }>) {
    entries.push({ type: "event", id: e.id, occurredAt: e.scheduledAt, summary: e.title, detail: e.status });
  }
  for (const g of galleries as Array<{ id: string; createdAt: Date; photoCount: number; status: string }>) {
    entries.push({ type: "gallery", id: g.id, occurredAt: g.createdAt, summary: `Gallery — ${g.photoCount} photos`, detail: g.status });
  }
  for (const a of albums as Array<{ id: string; createdAt: Date; status: string }>) {
    entries.push({ type: "album", id: a.id, occurredAt: a.createdAt, summary: "Album", detail: a.status });
  }
  for (const p of printOrders as Array<{ id: string; orderedAt: Date; status: string; copies: number }>) {
    entries.push({ type: "print_order", id: p.id, occurredAt: p.orderedAt, summary: `Print order — ${p.copies} copies`, detail: p.status });
  }
  for (const d of deliveries as Array<{ id: string; createdAt: Date; method: string; status: string }>) {
    entries.push({ type: "delivery", id: d.id, occurredAt: d.createdAt, summary: `Delivery via ${d.method}`, detail: d.status });
  }
  if (contract) {
    const c = contract as { id: string; createdAt: Date; title: string; status: string };
    entries.push({ type: "contract", id: c.id, occurredAt: c.createdAt, summary: c.title, detail: c.status });
  }

  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
