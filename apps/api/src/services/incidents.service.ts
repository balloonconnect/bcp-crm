import { prisma } from "@bcp/database";

async function recordPlatformActivity(actorId: string, action: string, resourceType: string, resourceId: string) {
  await prisma.auditLog.create({ data: { actorType: "platform_user", actorId, action, resourceType, resourceId } });
}

// ── Public status page ──────────────────────────────────────────────

export async function listPublicIncidents(limit = 20) {
  return prisma.incident.findMany({ orderBy: { startedAt: "desc" }, take: limit, include: { updates: { orderBy: { createdAt: "asc" } } } });
}

// ── Platform admin ───────────────────────────────────────────────────

export async function listIncidents() {
  return prisma.incident.findMany({ orderBy: { startedAt: "desc" }, include: { updates: { orderBy: { createdAt: "asc" } } } });
}

/** Creating an incident always posts its first update in the same step — a status-page incident with no initial message would be meaningless to a visitor reading it. */
export async function createIncident(input: { title: string; severity: string; affectedServices: string[]; message: string }, actorId: string) {
  const incident = await prisma.incident.create({
    data: { title: input.title, severity: input.severity as never, affectedServices: input.affectedServices, createdBy: actorId, updates: { create: { status: "investigating", message: input.message, createdBy: actorId } } },
    include: { updates: true },
  });
  await recordPlatformActivity(actorId, "incident.created", "Incident", incident.id);
  return incident;
}

/** Posting an update also moves the incident's own current status forward — a status-page incident whose header still says "Investigating" after an update marked "Resolved" would contradict its own timeline. */
export async function postIncidentUpdate(incidentId: string, input: { status: string; message: string }, actorId: string) {
  const [update] = await prisma.$transaction([
    prisma.incidentUpdate.create({ data: { incidentId, status: input.status as never, message: input.message, createdBy: actorId } }),
    prisma.incident.update({ where: { id: incidentId }, data: { status: input.status as never, resolvedAt: input.status === "resolved" ? new Date() : null } }),
  ]);
  await recordPlatformActivity(actorId, "incident.update_posted", "Incident", incidentId);
  return update;
}
