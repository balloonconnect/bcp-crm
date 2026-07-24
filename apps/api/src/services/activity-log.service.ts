import { prisma } from "@bcp/database";

/**
 * Thin wrapper around `AuditLog` (built in the platform-admin phase) for
 * studio-facing CRM actions — the "Recent activity" dashboard widget
 * reads from the same table platform admins already use for audit
 * trails, rather than a second parallel activity feed.
 */
export async function recordActivity(input: {
  studioId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      studioId: input.studioId,
      actorType: "studio_user",
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}

export async function listRecentActivity(studioId: string, limit = 10) {
  return prisma.auditLog.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
