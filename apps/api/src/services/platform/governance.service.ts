import { prisma } from "@bcp/database";

async function writePlatformAuditLog(input: {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorType: "platform_user",
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}

// ── Feature flags module ────────────────────────────────────────────────

export async function listFeatureFlags(studioId?: string) {
  return prisma.featureFlag.findMany({
    where: studioId ? { studioId } : { studioId: null },
    orderBy: { key: "asc" },
  });
}

export async function setFeatureFlag(input: {
  key: string;
  enabled: boolean;
  studioId?: string | null;
  actorId: string;
}) {
  const existing = await prisma.featureFlag.findFirst({
    where: { key: input.key, studioId: input.studioId ?? null },
  });

  const flag = existing
    ? await prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled: input.enabled, updatedBy: input.actorId },
      })
    : await prisma.featureFlag.create({
        data: { key: input.key, enabled: input.enabled, studioId: input.studioId ?? null, createdBy: input.actorId },
      });

  await writePlatformAuditLog({
    actorId: input.actorId,
    action: "feature_flag.updated",
    resourceType: "FeatureFlag",
    resourceId: flag.id,
    metadata: { key: input.key, enabled: input.enabled, studioId: input.studioId ?? null },
  });

  return flag;
}

// ── Announcements module ────────────────────────────────────────────────

export async function listAnnouncements(includeUnpublished = true) {
  return prisma.announcement.findMany({
    where: includeUnpublished ? {} : { isPublished: true },
    orderBy: { startsAt: "desc" },
  });
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  audience?: Record<string, unknown>;
  startsAt?: Date;
  endsAt?: Date;
  actorId: string;
}) {
  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      severity: input.severity,
      audience: input.audience,
      startsAt: input.startsAt ?? new Date(),
      endsAt: input.endsAt,
      createdBy: input.actorId,
    },
  });

  await writePlatformAuditLog({
    actorId: input.actorId,
    action: "announcement.created",
    resourceType: "Announcement",
    resourceId: announcement.id,
  });

  return announcement;
}

export async function publishAnnouncement(announcementId: string, actorId: string) {
  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data: { isPublished: true, updatedBy: actorId },
  });
  await writePlatformAuditLog({
    actorId,
    action: "announcement.published",
    resourceType: "Announcement",
    resourceId: announcementId,
  });
  return announcement;
}

// ── Support requests module ─────────────────────────────────────────────

export async function listSupportRequests(
  input: { status?: string; assignedTo?: string; page?: number; pageSize?: number } = {},
) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);
  const where = {
    ...(input.status ? { status: input.status as never } : {}),
    ...(input.assignedTo ? { assignedTo: input.assignedTo } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.supportRequest.findMany({
      where,
      include: { studio: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supportRequest.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

export async function assignSupportRequest(requestId: string, platformUserId: string, actorId: string) {
  const updated = await prisma.supportRequest.update({
    where: { id: requestId },
    data: { assignedTo: platformUserId, status: "in_progress" },
  });
  await writePlatformAuditLog({
    actorId,
    action: "support_request.assigned",
    resourceType: "SupportRequest",
    resourceId: requestId,
    metadata: { assignedTo: platformUserId },
  });
  return updated;
}

export async function resolveSupportRequest(requestId: string, actorId: string) {
  const updated = await prisma.supportRequest.update({
    where: { id: requestId },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  await writePlatformAuditLog({
    actorId,
    action: "support_request.resolved",
    resourceType: "SupportRequest",
    resourceId: requestId,
  });
  return updated;
}

// ── Audit logs module (platform-wide view) ──────────────────────────────

export async function listPlatformAuditLog(input: {
  studioId?: string;
  resourceType?: string;
  actorType?: "platform_user" | "studio_user" | "api_key" | "system";
  page?: number;
  pageSize?: number;
}) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 50, 200);
  const where = {
    ...(input.studioId ? { studioId: input.studioId } : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
    ...(input.actorType ? { actorType: input.actorType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

// ── System configuration module ─────────────────────────────────────────

export async function listSystemConfig() {
  return prisma.platformSetting.findMany({ orderBy: { key: "asc" } });
}

export async function setSystemConfig(key: string, value: unknown, actorId: string) {
  const setting = await prisma.platformSetting.upsert({
    where: { key },
    update: { value: value as never, updatedBy: actorId },
    create: { key, value: value as never, updatedBy: actorId },
  });

  await writePlatformAuditLog({
    actorId,
    action: "system_config.updated",
    resourceType: "PlatformSetting",
    resourceId: setting.id,
    metadata: { key },
  });

  return setting;
}
