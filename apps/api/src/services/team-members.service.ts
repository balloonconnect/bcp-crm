import { prisma } from "@bcp/database";
import { computeWorkloadSummary, computeTaskCompletionSummary, computeAttendanceRate } from "@bcp/team";
import { detectTeamConflicts, detectTravelConflicts, resolveEventWindow, type TimeWindow } from "@bcp/events";
import { recordActivity } from "./activity-log.service";

export class TeamMemberNotFoundError extends Error {
  readonly code = "TEAM_MEMBER_NOT_FOUND";
  constructor() {
    super("Team member not found");
    this.name = "TeamMemberNotFoundError";
  }
}

export async function listTeamMembers(studioId: string) {
  return prisma.studioUser.findMany({
    where: { studioId, status: { not: "deactivated" }, deletedAt: null },
    include: { roles: { include: { studioRole: { select: { key: true, name: true } } } }, teamProfile: true },
    orderBy: { name: "asc" },
  });
}

export async function getTeamMember(studioId: string, studioUserId: string) {
  const member = await prisma.studioUser.findFirst({
    where: { id: studioUserId, studioId, deletedAt: null },
    include: {
      roles: { include: { studioRole: { select: { key: true, name: true } } } },
      teamProfile: true,
      teamDocuments: { orderBy: { createdAt: "desc" } },
      teamEquipment: { where: { returnedAt: null }, include: { equipment: { select: { id: true, name: true } } } },
      eventAssignments: { include: { event: { select: { id: true, title: true, scheduledAt: true, status: true } } }, take: 20, orderBy: { event: { scheduledAt: "desc" } } },
    },
  });
  if (!member) throw new TeamMemberNotFoundError();
  return member;
}

export interface TeamProfileInput {
  employmentType?: string;
  skills?: string[];
  availabilityStatus?: string;
  salaryAmount?: number;
  freelancerRateAmount?: number;
  freelancerRateUnit?: string;
  paymentTerms?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

export async function updateTeamProfile(studioId: string, studioUserId: string, input: TeamProfileInput, actorId: string) {
  const member = await prisma.studioUser.findFirst({ where: { id: studioUserId, studioId, deletedAt: null } });
  if (!member) throw new TeamMemberNotFoundError();

  const { employmentType, skills, availabilityStatus, ...profileFields } = input;

  await prisma.studioUser.updateMany({
    where: { id: studioUserId, studioId },
    data: { employmentType: employmentType as never, skills, availabilityStatus: availabilityStatus as never },
  });

  const hasProfileFields = Object.values(profileFields).some((v) => v !== undefined);
  if (hasProfileFields) {
    await prisma.teamMemberProfile.upsert({
      where: { studioUserId },
      update: profileFields,
      create: { studioUserId, studioId, ...profileFields },
    });
  }

  await recordActivity({ studioId, actorId, action: "team_member.profile_updated", resourceType: "StudioUser", resourceId: studioUserId });
  return getTeamMember(studioId, studioUserId);
}

/** "Workload" and "task completion" — computed live from real Task/Event data, never stored, so they can't drift from what actually happened elsewhere in the app (see `@bcp/team`'s file-level doc comments). */
export async function getTeamMemberWorkload(studioId: string, studioUserId: string) {
  const [tasks, upcomingEventCount, attendanceRecords] = await Promise.all([
    prisma.task.findMany({ where: { studioId, assigneeId: studioUserId, deletedAt: null }, select: { status: true, dueDate: true, completedAt: true } }),
    prisma.eventAssignment.count({ where: { studioUserId, event: { studioId, scheduledAt: { gte: new Date() }, status: { not: "cancelled" } } } }),
    prisma.attendanceRecord.findMany({ where: { studioId, studioUserId, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, select: { status: true } }),
  ]);

  return {
    workload: computeWorkloadSummary(tasks, upcomingEventCount),
    taskCompletion: computeTaskCompletionSummary(tasks),
    attendanceRatePercent30d: computeAttendanceRate(attendanceRecords),
  };
}

/** Reuses `@bcp/events`' conflict detection directly — "Event conflict warnings" for a team member is exactly the team/travel conflict check from Prompt 18, just scoped to one person's whole upcoming schedule instead of a single candidate event. */
export async function getTeamMemberConflicts(studioId: string, studioUserId: string) {
  const upcomingAssignments = await prisma.eventAssignment.findMany({
    where: { studioUserId, event: { studioId, scheduledAt: { gte: new Date() }, status: { not: "cancelled" }, deletedAt: null } },
    include: { event: { select: { id: true, title: true, scheduledAt: true, endAt: true, venue: true } } },
  });

  const member = await prisma.studioUser.findUniqueOrThrow({ where: { id: studioUserId }, select: { name: true } });
  type ConflictEvent = { id: string; title: string; scheduledAt: Date; endAt: Date | null; venue: string | null };
  const events: ConflictEvent[] = upcomingAssignments.map((a: { event: ConflictEvent }) => a.event);

  const allConflicts: { eventId: string; eventTitle: string; conflictsWith: { eventId: string; eventTitle: string }[] }[] = [];
  const travelConflicts: { eventId: string; eventTitle: string; conflictsWith: { eventId: string; eventTitle: string }[] }[] = [];

  for (const event of events) {
    const window: TimeWindow = resolveEventWindow(event.scheduledAt, event.endAt);
    const others = events.filter((e: ConflictEvent) => e.id !== event.id).map((e: ConflictEvent) => ({ eventId: e.id, eventTitle: e.title, window: resolveEventWindow(e.scheduledAt, e.endAt) }));

    const team = detectTeamConflicts({ window, excludeEventId: event.id, assignments: [{ studioUserId, studioUserName: member.name, existingEvents: others }] });
    if (team.length) allConflicts.push({ eventId: event.id, eventTitle: event.title, conflictsWith: team[0]!.conflictsWith });

    const travel = detectTravelConflicts({
      window,
      excludeEventId: event.id,
      venue: event.venue,
      assignments: [{ studioUserId, studioUserName: member.name, existingEvents: events.filter((e: ConflictEvent) => e.id !== event.id).map((e: ConflictEvent) => ({ eventId: e.id, eventTitle: e.title, window: resolveEventWindow(e.scheduledAt, e.endAt), venue: e.venue })) }],
    });
    if (travel.length) travelConflicts.push({ eventId: event.id, eventTitle: event.title, conflictsWith: travel[0]!.conflictsWith });
  }

  return { teamConflicts: allConflicts, travelConflicts };
}
