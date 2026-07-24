import { prisma } from "@bcp/database";

/**
 * "Device history" isn't a separate table — a device, for our purposes, is
 * whatever userAgent+ipAddress a Session was created with. Listing every
 * Session (active and past) for an actor already gives device history; we
 * don't model a device more richly than that (see docs/authentication.md).
 */
export async function listSessions(studioUserId: string, studioId: string) {
  return prisma.session.findMany({
    where: { actorId: studioUserId, actorType: "studio_user", studioId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
}

export class SessionNotFoundError extends Error {
  readonly code = "SESSION_NOT_FOUND";
  constructor() {
    super("Session not found");
    this.name = "SessionNotFoundError";
  }
}

export async function revokeSession(
  studioUserId: string,
  studioId: string,
  sessionId: string,
): Promise<void> {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, actorId: studioUserId, actorType: "studio_user", studioId },
  });
  if (!session) throw new SessionNotFoundError();

  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

/** Logout from all devices: revokes every non-revoked session for this actor. */
export async function revokeAllSessions(
  studioUserId: string,
  studioId: string,
  exceptSessionId?: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      actorId: studioUserId,
      actorType: "studio_user",
      studioId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function listLoginHistory(studioUserId: string, studioId: string, limit = 50) {
  return prisma.loginHistory.findMany({
    where: { actorId: studioUserId, actorType: "studio_user", studioId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
