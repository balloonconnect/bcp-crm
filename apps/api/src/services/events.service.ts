import { prisma } from "@bcp/database";
import {
  resolveEventWindow,
  detectTeamConflicts,
  detectEquipmentConflicts,
  detectDateTimeConflicts,
  detectTravelConflicts,
  type TimeWindow,
} from "@bcp/events";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { recordActivity } from "./activity-log.service";

export class EventNotFoundError extends Error {
  readonly code = "EVENT_NOT_FOUND";
  constructor() {
    super("Event not found");
    this.name = "EventNotFoundError";
  }
}

const eventInclude = {
  assignments: { include: { studioUser: { select: { id: true, name: true } } } },
  equipment: { include: { equipment: { select: { id: true, name: true } } } },
  services: { include: { service: { select: { id: true, name: true } } } },
  shotListItems: { orderBy: { order: "asc" as const } },
  scheduleItems: { orderBy: { time: "asc" as const } },
  client: { select: { id: true, name: true } },
};

export interface EventListFilter {
  status?: string;
  from?: Date;
  to?: Date;
}

export async function listEvents(studioId: string, filter: EventListFilter = {}) {
  return prisma.event.findMany({
    where: {
      studioId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(filter.from || filter.to ? { scheduledAt: { gte: filter.from, lte: filter.to } } : {}),
    },
    include: eventInclude,
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getEvent(studioId: string, eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, studioId, deletedAt: null }, include: eventInclude });
  if (!event) throw new EventNotFoundError();
  return event;
}

export interface EventInput {
  branchId?: string;
  clientId?: string;
  leadId?: string;
  bookingId?: string;
  title: string;
  eventType: string;
  scheduledAt: string;
  endAt?: string;
  venue?: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressPostalCode?: string;
  latitude?: number;
  longitude?: number;
  contactPersonName?: string;
  contactPersonPhone?: string;
  dressNotes?: string;
  travelNotes?: string;
  accommodationNotes?: string;
  internalNotes?: string;
  deliverables?: string[];
  assignedUserIds?: string[];
  equipment?: { equipmentId: string; quantity: number }[];
  serviceIds?: string[];
}

/**
 * The single conflict-check computation, run both standalone (a studio
 * checking before committing to a date) and internally on every create/
 * update — never a hard block (a studio might genuinely want to
 * double-book a team member across two small events), just surfaced so
 * a human decides. See `@bcp/events`' `conflicts.ts` for the actual
 * detection logic; this function's job is only gathering the candidate
 * data those pure functions need from the database.
 */
export async function checkEventConflicts(studioId: string, input: { scheduledAt: string; endAt?: string; venue?: string; assignedUserIds?: string[]; equipment?: { equipmentId: string; quantity: number }[] }, excludeEventId?: string) {
  const window: TimeWindow = resolveEventWindow(new Date(input.scheduledAt), input.endAt ? new Date(input.endAt) : null);
  // Widen the query window generously (±1 day) so travel-buffer checks against adjacent-day events still see their candidates.
  const queryFrom = new Date(window.start.getTime() - 24 * 60 * 60 * 1000);
  const queryTo = new Date(window.end.getTime() + 24 * 60 * 60 * 1000);

  const nearbyEvents = await prisma.event.findMany({
    where: { studioId, deletedAt: null, scheduledAt: { gte: queryFrom, lte: queryTo } },
    select: { id: true, title: true, scheduledAt: true, endAt: true, venue: true, assignments: { select: { studioUserId: true, studioUser: { select: { name: true } } } }, equipment: { select: { equipmentId: true, quantity: true } } },
  });

  const toWindow = (e: { scheduledAt: Date; endAt: Date | null }) => resolveEventWindow(e.scheduledAt, e.endAt);

  const teamConflicts = input.assignedUserIds?.length
    ? detectTeamConflicts({
        window,
        excludeEventId,
        assignments: input.assignedUserIds.map((studioUserId) => ({
          studioUserId,
          studioUserName: nearbyEvents.flatMap((e: { assignments: { studioUserId: string; studioUser: { name: string } }[] }) => e.assignments).find((a: { studioUserId: string; studioUser: { name: string } }) => a.studioUserId === studioUserId)?.studioUser.name ?? studioUserId,
          existingEvents: nearbyEvents
            .filter((e: { assignments: { studioUserId: string }[] }) => e.assignments.some((a) => a.studioUserId === studioUserId))
            .map((e: { id: string; title: string; scheduledAt: Date; endAt: Date | null }) => ({ eventId: e.id, eventTitle: e.title, window: toWindow(e) })),
        })),
      })
    : [];

  const travelConflicts = input.assignedUserIds?.length
    ? detectTravelConflicts({
        window,
        excludeEventId,
        venue: input.venue,
        assignments: input.assignedUserIds.map((studioUserId) => ({
          studioUserId,
          studioUserName: nearbyEvents.flatMap((e: { assignments: { studioUserId: string; studioUser: { name: string } }[] }) => e.assignments).find((a: { studioUserId: string; studioUser: { name: string } }) => a.studioUserId === studioUserId)?.studioUser.name ?? studioUserId,
          existingEvents: nearbyEvents
            .filter((e: { assignments: { studioUserId: string }[] }) => e.assignments.some((a) => a.studioUserId === studioUserId))
            .map((e: { id: string; title: string; scheduledAt: Date; endAt: Date | null; venue: string | null }) => ({ eventId: e.id, eventTitle: e.title, window: toWindow(e), venue: e.venue })),
        })),
      })
    : [];

  let equipmentConflicts: ReturnType<typeof detectEquipmentConflicts> = [];
  if (input.equipment?.length) {
    const equipmentRows = await prisma.equipment.findMany({ where: { studioId, id: { in: input.equipment.map((e) => e.equipmentId) } }, select: { id: true, name: true, quantity: true } });
    const rowById = new Map<string, { id: string; name: string; quantity: number }>(equipmentRows.map((e: { id: string; name: string; quantity: number }) => [e.id, e]));

    equipmentConflicts = detectEquipmentConflicts({
      window,
      excludeEventId,
      items: input.equipment.map((item) => {
        const row = rowById.get(item.equipmentId);
        return {
          equipmentId: item.equipmentId,
          equipmentName: row?.name ?? item.equipmentId,
          ownedQuantity: row?.quantity ?? 1,
          requestedQuantity: item.quantity,
          existingBookings: nearbyEvents
            .flatMap((e: { id: string; title: string; scheduledAt: Date; endAt: Date | null; equipment: { equipmentId: string; quantity: number }[] }) =>
              e.equipment.filter((eq) => eq.equipmentId === item.equipmentId).map((eq) => ({ eventId: e.id, eventTitle: e.title, window: toWindow(e), quantity: eq.quantity })),
            ),
        };
      }),
    });
  }

  const dateTimeConflicts = input.venue
    ? detectDateTimeConflicts({
        window,
        excludeEventId,
        existingEvents: nearbyEvents.filter((e: { venue: string | null }) => e.venue && e.venue === input.venue).map((e: { id: string; title: string; scheduledAt: Date; endAt: Date | null }) => ({ eventId: e.id, eventTitle: e.title, window: toWindow(e) })),
      })
    : [];

  return { teamConflicts, equipmentConflicts, dateTimeConflicts, travelConflicts };
}

export async function createEvent(studioId: string, input: EventInput, actorId: string) {
  await assertWithinPlanLimit(studioId, "maxEvents");

  const event = await prisma.event.create({
    data: {
      studioId,
      branchId: input.branchId,
      clientId: input.clientId,
      leadId: input.leadId,
      bookingId: input.bookingId,
      title: input.title,
      eventType: input.eventType,
      status: "confirmed",
      scheduledAt: new Date(input.scheduledAt),
      endAt: input.endAt ? new Date(input.endAt) : undefined,
      venue: input.venue,
      addressLine1: input.addressLine1,
      addressCity: input.addressCity,
      addressState: input.addressState,
      addressPostalCode: input.addressPostalCode,
      latitude: input.latitude,
      longitude: input.longitude,
      contactPersonName: input.contactPersonName,
      contactPersonPhone: input.contactPersonPhone,
      dressNotes: input.dressNotes,
      travelNotes: input.travelNotes,
      accommodationNotes: input.accommodationNotes,
      internalNotes: input.internalNotes,
      deliverables: input.deliverables ?? [],
      createdBy: actorId,
      assignments: input.assignedUserIds?.length ? { create: input.assignedUserIds.map((studioUserId) => ({ studioUserId })) } : undefined,
      equipment: input.equipment?.length ? { create: input.equipment.map((e) => ({ equipmentId: e.equipmentId, quantity: e.quantity })) } : undefined,
      services: input.serviceIds?.length ? { create: input.serviceIds.map((serviceId) => ({ serviceId })) } : undefined,
    },
    include: eventInclude,
  });

  if (input.leadId) {
    await prisma.lead.updateMany({ where: { id: input.leadId, studioId }, data: { status: "won" } });
  }

  await recordActivity({ studioId, actorId, action: "event.created", resourceType: "Event", resourceId: event.id, metadata: { title: event.title } });

  return event;
}

export async function updateEvent(studioId: string, eventId: string, input: Partial<EventInput>, actorId: string) {
  const existing = await prisma.event.findFirst({ where: { id: eventId, studioId, deletedAt: null } });
  if (!existing) throw new EventNotFoundError();

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.event.updateMany({
      where: { id: eventId, studioId },
      data: {
        branchId: input.branchId,
        clientId: input.clientId,
        title: input.title,
        eventType: input.eventType,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
        venue: input.venue,
        addressLine1: input.addressLine1,
        addressCity: input.addressCity,
        addressState: input.addressState,
        addressPostalCode: input.addressPostalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        contactPersonName: input.contactPersonName,
        contactPersonPhone: input.contactPersonPhone,
        dressNotes: input.dressNotes,
        travelNotes: input.travelNotes,
        accommodationNotes: input.accommodationNotes,
        internalNotes: input.internalNotes,
        deliverables: input.deliverables,
      },
    });

    if (input.assignedUserIds) {
      await tx.eventAssignment.deleteMany({ where: { eventId } });
      if (input.assignedUserIds.length) await tx.eventAssignment.createMany({ data: input.assignedUserIds.map((studioUserId) => ({ eventId, studioUserId })) });
    }
    if (input.equipment) {
      await tx.eventEquipment.deleteMany({ where: { eventId } });
      if (input.equipment.length) await tx.eventEquipment.createMany({ data: input.equipment.map((e) => ({ eventId, equipmentId: e.equipmentId, quantity: e.quantity })) });
    }
    if (input.serviceIds) {
      await tx.eventService.deleteMany({ where: { eventId } });
      if (input.serviceIds.length) await tx.eventService.createMany({ data: input.serviceIds.map((serviceId) => ({ eventId, serviceId })) });
    }
  });

  await recordActivity({ studioId, actorId, action: "event.updated", resourceType: "Event", resourceId: eventId });

  return getEvent(studioId, eventId);
}

export async function updateEventStatus(studioId: string, eventId: string, status: string, actorId: string) {
  await prisma.event.updateMany({ where: { id: eventId, studioId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "event.status_changed", resourceType: "Event", resourceId: eventId, metadata: { status } });
  return getEvent(studioId, eventId);
}

export async function updateEditingStatus(studioId: string, eventId: string, editingStatus: string, actorId: string) {
  await prisma.event.updateMany({ where: { id: eventId, studioId }, data: { editingStatus: editingStatus as never } });
  await recordActivity({ studioId, actorId, action: "event.editing_status_changed", resourceType: "Event", resourceId: eventId, metadata: { editingStatus } });
  return getEvent(studioId, eventId);
}

// ── Shot list ────────────────────────────────────────────────────────

export async function addShotListItem(studioId: string, eventId: string, description: string, actorId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, studioId } });
  if (!event) throw new EventNotFoundError();

  const count = await prisma.eventShotListItem.count({ where: { eventId } });
  const item = await prisma.eventShotListItem.create({ data: { eventId, description, order: count } });
  await recordActivity({ studioId, actorId, action: "event.shot_added", resourceType: "Event", resourceId: eventId });
  return item;
}

export async function toggleShotListItem(studioId: string, eventId: string, itemId: string, completed: boolean) {
  const event = await prisma.event.findFirst({ where: { id: eventId, studioId } });
  if (!event) throw new EventNotFoundError();
  return prisma.eventShotListItem.update({ where: { id: itemId }, data: { completed } });
}

export async function removeShotListItem(studioId: string, eventId: string, itemId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, studioId } });
  if (!event) throw new EventNotFoundError();
  await prisma.eventShotListItem.delete({ where: { id: itemId } });
}

// ── Intra-day schedule ───────────────────────────────────────────────

export async function addScheduleItem(studioId: string, eventId: string, input: { time: string; label: string }, actorId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, studioId } });
  if (!event) throw new EventNotFoundError();

  const count = await prisma.eventScheduleItem.count({ where: { eventId } });
  const item = await prisma.eventScheduleItem.create({ data: { eventId, time: new Date(input.time), label: input.label, order: count } });
  await recordActivity({ studioId, actorId, action: "event.schedule_item_added", resourceType: "Event", resourceId: eventId });
  return item;
}

export async function removeScheduleItem(studioId: string, eventId: string, itemId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, studioId } });
  if (!event) throw new EventNotFoundError();
  await prisma.eventScheduleItem.delete({ where: { id: itemId } });
}
