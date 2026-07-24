import { prisma } from "@bcp/database";
import { findOverlappingLeave } from "@bcp/team";
import { recordActivity } from "./activity-log.service";

// ── Documents ────────────────────────────────────────────────────────

export async function addTeamDocument(studioId: string, studioUserId: string, input: { name: string; documentType?: string; fileKey: string; expiresAt?: string }, actorId: string) {
  const doc = await prisma.teamDocument.create({
    data: { studioId, studioUserId, name: input.name, documentType: (input.documentType as never) ?? "other", fileKey: input.fileKey, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, uploadedBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "team_document.added", resourceType: "StudioUser", resourceId: studioUserId, metadata: { name: input.name } });
  return doc;
}

export async function removeTeamDocument(studioId: string, documentId: string, actorId: string) {
  await prisma.teamDocument.deleteMany({ where: { id: documentId, studioId } });
  await recordActivity({ studioId, actorId, action: "team_document.removed", resourceType: "TeamDocument", resourceId: documentId });
}

// ── Equipment custody ────────────────────────────────────────────────

export async function assignEquipment(studioId: string, studioUserId: string, equipmentId: string, notes: string | undefined, actorId: string) {
  const assignment = await prisma.teamEquipmentAssignment.create({ data: { studioId, studioUserId, equipmentId, notes } });
  await recordActivity({ studioId, actorId, action: "team_equipment.assigned", resourceType: "StudioUser", resourceId: studioUserId, metadata: { equipmentId } });
  return assignment;
}

export async function returnEquipment(studioId: string, assignmentId: string, actorId: string) {
  await prisma.teamEquipmentAssignment.updateMany({ where: { id: assignmentId, studioId }, data: { returnedAt: new Date() } });
  await recordActivity({ studioId, actorId, action: "team_equipment.returned", resourceType: "TeamEquipmentAssignment", resourceId: assignmentId });
}

// ── Attendance ───────────────────────────────────────────────────────

export async function listAttendance(studioId: string, studioUserId: string, from?: Date, to?: Date) {
  return prisma.attendanceRecord.findMany({
    where: { studioId, studioUserId, ...(from || to ? { date: { gte: from, lte: to } } : {}) },
    orderBy: { date: "desc" },
  });
}

export async function recordAttendance(studioId: string, studioUserId: string, input: { date: string; status?: string; checkInAt?: string; checkOutAt?: string; notes?: string }, actorId: string) {
  const date = new Date(new Date(input.date).toISOString().slice(0, 10)); // normalize to the calendar day
  const record = await prisma.attendanceRecord.upsert({
    where: { studioUserId_date: { studioUserId, date } },
    update: { status: (input.status as never) ?? "present", checkInAt: input.checkInAt ? new Date(input.checkInAt) : undefined, checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : undefined, notes: input.notes },
    create: { studioId, studioUserId, date, status: (input.status as never) ?? "present", checkInAt: input.checkInAt ? new Date(input.checkInAt) : undefined, checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : undefined, notes: input.notes },
  });
  await recordActivity({ studioId, actorId, action: "attendance.recorded", resourceType: "StudioUser", resourceId: studioUserId, metadata: { date: input.date, status: input.status } });
  return record;
}

// ── Leave ────────────────────────────────────────────────────────────

export class OverlappingLeaveError extends Error {
  readonly code = "OVERLAPPING_LEAVE";
  constructor() {
    super("This overlaps with an existing leave request for this person.");
    this.name = "OverlappingLeaveError";
  }
}

export async function listLeaveRequests(studioId: string, filter?: { studioUserId?: string; status?: string }) {
  return prisma.leaveRequest.findMany({
    where: { studioId, ...(filter?.studioUserId ? { studioUserId: filter.studioUserId } : {}), ...(filter?.status ? { status: filter.status as never } : {}) },
    include: { studioUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function requestLeave(studioId: string, studioUserId: string, input: { leaveType?: string; startDate: string; endDate: string; reason?: string }, actorId: string) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  const existing = await prisma.leaveRequest.findMany({ where: { studioId, studioUserId, status: { in: ["pending", "approved"] } }, select: { id: true, startDate: true, endDate: true } });
  const overlap = findOverlappingLeave({ startDate, endDate }, existing);
  if (overlap.length > 0) throw new OverlappingLeaveError();

  const leave = await prisma.leaveRequest.create({ data: { studioId, studioUserId, leaveType: (input.leaveType as never) ?? "casual", startDate, endDate, reason: input.reason } });
  await recordActivity({ studioId, actorId, action: "leave.requested", resourceType: "StudioUser", resourceId: studioUserId, metadata: { leaveType: input.leaveType } });
  return leave;
}

export async function decideLeave(studioId: string, leaveId: string, decision: "approved" | "rejected", actorId: string) {
  await prisma.leaveRequest.updateMany({ where: { id: leaveId, studioId }, data: { status: decision, approvedByUserId: actorId, approvedAt: new Date() } });
  await recordActivity({ studioId, actorId, action: `leave.${decision}`, resourceType: "LeaveRequest", resourceId: leaveId });
  return prisma.leaveRequest.findUnique({ where: { id: leaveId } });
}

// ── Performance notes ────────────────────────────────────────────────

export async function listPerformanceNotes(studioId: string, studioUserId: string) {
  return prisma.performanceNote.findMany({ where: { studioId, studioUserId }, orderBy: { reviewedAt: "desc" } });
}

export async function addPerformanceNote(studioId: string, studioUserId: string, input: { periodLabel: string; ratingScore?: number; note?: string }, actorId: string) {
  const note = await prisma.performanceNote.create({ data: { studioId, studioUserId, periodLabel: input.periodLabel, ratingScore: input.ratingScore, note: input.note, reviewedByUserId: actorId } });
  await recordActivity({ studioId, actorId, action: "performance_note.added", resourceType: "StudioUser", resourceId: studioUserId, metadata: { periodLabel: input.periodLabel } });
  return note;
}
