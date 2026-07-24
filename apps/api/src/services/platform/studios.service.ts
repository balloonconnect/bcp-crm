import { prisma } from "@bcp/database";

export interface ListStudiosInput {
  status?: "trial" | "active" | "grace" | "suspended" | "expired" | "cancelled";
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listStudios(input: ListStudiosInput = {}) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);

  const where = {
    deletedAt: null,
    ...(input.status ? { status: input.status } : {}),
    ...(input.search ? { name: { contains: input.search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.studio.findMany({
      where,
      include: { brand: { select: { displayName: true, logoUrl: true } }, _count: { select: { users: true, branches: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.studio.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

export async function getStudioDetail(studioId: string) {
  return prisma.studio.findUnique({
    where: { id: studioId },
    include: {
      brand: true,
      branches: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 5, include: { plan: true } },
      licenseKeys: { orderBy: { issuedAt: "desc" }, take: 5 },
      domains: { where: { deletedAt: null } },
      _count: { select: { users: true } },
    },
  });
}

export class StudioNotFoundError extends Error {
  readonly code = "STUDIO_NOT_FOUND";
  constructor() {
    super("Studio not found");
    this.name = "StudioNotFoundError";
  }
}

async function writePlatformAuditLog(input: {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  studioId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      studioId: input.studioId,
      actorType: "platform_user",
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}

export async function suspendStudio(studioId: string, actorId: string, reason?: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) throw new StudioNotFoundError();

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: { status: "suspended", suspendedAt: new Date(), updatedBy: actorId },
  });

  await writePlatformAuditLog({
    actorId,
    action: "studio.suspended",
    resourceType: "Studio",
    resourceId: studioId,
    studioId,
    metadata: { reason },
  });

  return updated;
}

export async function reinstateStudio(studioId: string, actorId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) throw new StudioNotFoundError();

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: { status: "active", suspendedAt: null, updatedBy: actorId },
  });

  await writePlatformAuditLog({ actorId, action: "studio.reinstated", resourceType: "Studio", resourceId: studioId, studioId });
  return updated;
}

// ── Users module — platform staff + a cross-studio user search ─────────

export async function listPlatformUsers() {
  return prisma.platformUser.findMany({
    where: { deletedAt: null },
    include: { roles: { include: { platformRole: { select: { key: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export interface SearchStudioUsersInput {
  email?: string;
  studioId?: string;
  page?: number;
  pageSize?: number;
}

/** Cross-studio user search — platform support needs to find "which studio is this email in" without knowing the studio slug up front. */
export async function searchStudioUsers(input: SearchStudioUsersInput) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);

  const where = {
    deletedAt: null,
    ...(input.studioId ? { studioId: input.studioId } : {}),
    ...(input.email ? { email: { contains: input.email, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.studioUser.findMany({
      where,
      select: {
        id: true,
        studioId: true,
        email: true,
        name: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        studio: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.studioUser.count({ where }),
  ]);

  return { items, page, pageSize, total };
}
