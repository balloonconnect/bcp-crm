import { prisma } from "@bcp/database";
import { canTransition, computeBookingCostSummary, resolveMilestoneStatus, type BookingStatus } from "@bcp/bookings";
import { recordActivity } from "./activity-log.service";

export class BookingNotFoundError extends Error {
  readonly code = "BOOKING_NOT_FOUND";
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}

export class InvalidBookingTransitionError extends Error {
  readonly code = "INVALID_BOOKING_TRANSITION";
  constructor(status: string) {
    super(`Cannot change the status of a ${status} booking — it's already closed.`);
    this.name = "InvalidBookingTransitionError";
  }
}

const bookingInclude = {
  lineItems: { orderBy: { order: "asc" as const } },
  paymentSchedule: { orderBy: { order: "asc" as const } },
  teamAssignments: { include: { studioUser: { select: { id: true, name: true } } } },
  events: { orderBy: { scheduledAt: "asc" as const } },
  client: { select: { id: true, name: true } },
  package: { select: { id: true, name: true } },
  contract: { select: { id: true, title: true, status: true } },
};

/** Refreshes each payment milestone's status against today's date (pending → overdue) on every read, rather than relying on a scheduled job or someone manually flipping it — see `@bcp/bookings`' `resolveMilestoneStatus` doc comment. */
async function refreshMilestoneStatuses(milestones: { id: string; dueDate: Date | null; status: string }[]) {
  const now = new Date();
  const toFlip = milestones.filter((m) => resolveMilestoneStatus({ dueDate: m.dueDate, status: m.status as never }, now) === "overdue" && m.status !== "overdue");
  if (toFlip.length > 0) {
    await prisma.bookingPaymentScheduleItem.updateMany({ where: { id: { in: toFlip.map((m) => m.id) } }, data: { status: "overdue" } });
  }
}

export async function listBookings(studioId: string, filter?: { status?: string; clientId?: string }) {
  return prisma.booking.findMany({
    where: { studioId, ...(filter?.status ? { status: filter.status as never } : {}), ...(filter?.clientId ? { clientId: filter.clientId } : {}) },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getBooking(studioId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, studioId }, include: bookingInclude });
  if (!booking) throw new BookingNotFoundError();
  await refreshMilestoneStatuses(booking.paymentSchedule);
  return booking;
}

export async function getBookingByQuotationId(studioId: string, quotationId: string) {
  const booking = await prisma.booking.findFirst({ where: { studioId, quotationId }, include: bookingInclude });
  if (!booking) throw new BookingNotFoundError();
  return booking;
}

export interface BookingUpdateInput {
  branchId?: string;
  deliverables?: string[];
  notes?: string;
}

export async function updateBooking(studioId: string, bookingId: string, input: BookingUpdateInput, actorId: string) {
  const existing = await prisma.booking.findFirst({ where: { id: bookingId, studioId } });
  if (!existing) throw new BookingNotFoundError();

  await prisma.booking.updateMany({ where: { id: bookingId, studioId }, data: input });
  await recordActivity({ studioId, actorId, action: "booking.updated", resourceType: "Booking", resourceId: bookingId });

  return getBooking(studioId, bookingId);
}

export async function changeBookingStatus(studioId: string, bookingId: string, status: BookingStatus, actorId: string) {
  const existing = await prisma.booking.findFirst({ where: { id: bookingId, studioId } });
  if (!existing) throw new BookingNotFoundError();
  if (!canTransition(existing.status as BookingStatus)) throw new InvalidBookingTransitionError(existing.status);

  await prisma.booking.updateMany({ where: { id: bookingId, studioId }, data: { status } });
  await recordActivity({ studioId, actorId, action: "booking.status_changed", resourceType: "Booking", resourceId: bookingId, metadata: { status } });

  return getBooking(studioId, bookingId);
}

export async function recomputeBookingCost(studioId: string, bookingId: string, actorId: string) {
  const booking = await getBooking(studioId, bookingId);
  const summary = computeBookingCostSummary(booking.lineItems.map((i: { unitPrice: number; quantity: number; internalPrice: number | null }) => i));

  await prisma.booking.updateMany({
    where: { id: bookingId, studioId },
    data: { sellingPrice: summary.sellingPrice, internalCost: summary.internalCost, estimatedProfit: summary.estimatedProfit },
  });
  await recordActivity({ studioId, actorId, action: "booking.cost_recomputed", resourceType: "Booking", resourceId: bookingId });

  return getBooking(studioId, bookingId);
}

// ── Team assignment ──────────────────────────────────────────────────

export async function assignTeamMember(studioId: string, bookingId: string, studioUserId: string, role: string | undefined, actorId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, studioId } });
  if (!booking) throw new BookingNotFoundError();

  await prisma.bookingTeamAssignment.upsert({
    where: { bookingId_studioUserId: { bookingId, studioUserId } },
    update: { role },
    create: { bookingId, studioUserId, role },
  });
  await recordActivity({ studioId, actorId, action: "booking.team_assigned", resourceType: "Booking", resourceId: bookingId, metadata: { studioUserId, role } });

  return getBooking(studioId, bookingId);
}

export async function removeTeamMember(studioId: string, bookingId: string, assignmentId: string, actorId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, studioId } });
  if (!booking) throw new BookingNotFoundError();

  await prisma.bookingTeamAssignment.deleteMany({ where: { id: assignmentId, bookingId } });
  await recordActivity({ studioId, actorId, action: "booking.team_removed", resourceType: "Booking", resourceId: bookingId, metadata: { assignmentId } });

  return getBooking(studioId, bookingId);
}

// ── Payment milestones ───────────────────────────────────────────────

export async function updatePaymentMilestone(studioId: string, bookingId: string, milestoneId: string, status: "pending" | "paid" | "overdue", actorId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, studioId } });
  if (!booking) throw new BookingNotFoundError();

  await prisma.bookingPaymentScheduleItem.updateMany({ where: { id: milestoneId, bookingId }, data: { status } });
  await recordActivity({ studioId, actorId, action: "booking.payment_milestone_updated", resourceType: "Booking", resourceId: bookingId, metadata: { milestoneId, status } });

  return getBooking(studioId, bookingId);
}
