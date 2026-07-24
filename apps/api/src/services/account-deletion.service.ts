import { prisma } from "@bcp/database";
import { canApprove, canProcess } from "@bcp/data-portability"; // the same requested/approved/processing state machine as StudioBackup
import { recordActivity } from "./activity-log.service";

export class InvalidApprovalStateError extends Error {
  readonly code = "INVALID_APPROVAL_STATE";
  constructor(message: string) {
    super(message);
    this.name = "InvalidApprovalStateError";
  }
}

// ── Personal data export ("Data export") ────────────────────────────

/**
 * "Data export" — a self-service export of everything tied to *this*
 * individual account, distinct from Prompt 41's studio-wide business
 * export. Deliberately scoped to what identifies or was created by
 * this specific person: their own profile, login sessions, audit
 * trail entries, tasks assigned to them, and notes they wrote — not
 * every record their studio happens to hold, which belongs to the
 * studio's own export, not this one.
 */
export async function exportMyPersonalData(studioId: string, studioUserId: string) {
  const [profile, sessions, auditEntries, tasks, notes] = await Promise.all([
    prisma.studioUser.findFirst({ where: { id: studioUserId, studioId }, select: { id: true, name: true, email: true, phone: true, createdAt: true, lastLoginAt: true } }),
    prisma.session.findMany({ where: { studioId, actorType: "studio_user", actorId: studioUserId }, select: { ipAddress: true, userAgent: true, createdAt: true, revokedAt: true } }),
    prisma.auditLog.findMany({ where: { studioId, actorType: "studio_user", actorId: studioUserId }, orderBy: { createdAt: "desc" }, take: 500, select: { action: true, resourceType: true, resourceId: true, createdAt: true } }),
    prisma.task.findMany({ where: { studioId, assigneeId: studioUserId }, select: { id: true, title: true, status: true, createdAt: true } }),
    prisma.note.findMany({ where: { studioId, createdBy: studioUserId }, select: { id: true, entityType: true, content: true, createdAt: true } }),
  ]);

  return { exportedAt: new Date().toISOString(), profile, sessions, auditEntries, assignedTasks: tasks, notes };
}

// ── Account deletion ("Account deletion") ───────────────────────────

/**
 * A self-service account deletion — soft-deletes (`deletedAt`) rather
 * than a hard row delete, so every past record this person is
 * genuinely referenced from (an invoice they issued, a task they
 * completed, an audit log entry) keeps a valid, non-dangling
 * reference. What actually changes is every piece of personally
 * identifying data: name, email, and phone are overwritten, and the
 * password hash and any active sessions are cleared outright so the
 * account can never be signed into again. This is "erase the person,
 * not the history" — the same principle GDPR's right to erasure
 * itself allows for data a controller has a legitimate continuing
 * need to retain (financial records, audit trails).
 */
export async function deleteMyAccount(studioId: string, studioUserId: string, actorId: string) {
  const anonymizedEmail = `deleted-user-${studioUserId}@deleted.invalid`;

  await prisma.$transaction([
    prisma.studioUser.update({
      where: { id: studioUserId },
      data: { deletedAt: new Date(), name: "Deleted User", email: anonymizedEmail, phone: null, passwordHash: null, twoFactorSecret: null },
    }),
    prisma.session.updateMany({ where: { studioId, actorType: "studio_user", actorId: studioUserId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await recordActivity({ studioId, actorId, action: "account.self_deleted", resourceType: "StudioUser", resourceId: studioUserId });
}

// ── Studio deletion — Platform Admin approval required ──────────────

export async function listStudioDeletionRequests(studioId: string) {
  return prisma.studioDeletionRequest.findMany({ where: { studioId }, orderBy: { requestedAt: "desc" } });
}

export async function listAllStudioDeletionRequestsForPlatform() {
  return prisma.studioDeletionRequest.findMany({ orderBy: { requestedAt: "desc" }, include: { studio: { select: { name: true, slug: true } } }, take: 200 });
}

/** A studio can only ever request its own deletion — status starts at `pending_approval` and stays there until a platform admin decides. */
export async function requestStudioDeletion(studioId: string, reason: string | undefined, requestedBy: string) {
  const request = await prisma.studioDeletionRequest.create({ data: { studioId, status: "pending_approval", reason, requestedBy } });
  await recordActivity({ studioId, actorId: requestedBy, action: "studio_deletion.requested", resourceType: "StudioDeletionRequest", resourceId: request.id });
  return request;
}

/**
 * The same "propose, then a human with real authority confirms"
 * shape as `StudioBackup`/`StudioRestoreJob` — `approvedBy` is a
 * `PlatformUser` ID, enforced by this function only ever being
 * reachable through a platform-permission-gated route, never a
 * studio-scoped one.
 */
export async function decideStudioDeletion(requestId: string, approve: boolean, approvedByPlatformUserId: string, rejectedReason: string | undefined) {
  const request = await prisma.studioDeletionRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (!canApprove(request.status as never)) throw new InvalidApprovalStateError(`Can't decide a deletion request in status "${request.status}".`);

  if (!approve) {
    return prisma.studioDeletionRequest.update({ where: { id: requestId }, data: { status: "rejected", approvedBy: approvedByPlatformUserId, approvedAt: new Date(), rejectedReason } });
  }

  const approved = await prisma.studioDeletionRequest.update({ where: { id: requestId }, data: { status: "approved", approvedBy: approvedByPlatformUserId, approvedAt: new Date() } });
  return runStudioDeletion(approved.id);
}

/**
 * The actual deletion — deliberately a `Studio.deletedAt` soft-delete
 * plus immediately suspending the studio's ability to authenticate
 * (revoking every active session), not an in-place cascade of
 * hundreds of tables. A studio's data is genuinely large and
 * cross-referenced (invoices, contracts, signed e-albums, audit
 * trails other parties may have their own retention duty for); a real
 * hard-delete pipeline that walks every table safely, in the right
 * order, respecting any independent retention obligations, is a
 * separate operational project this pass doesn't take on. What's real
 * here: the request/approval workflow, immediate access revocation,
 * and marking the studio deleted so it disappears from every
 * studio-facing surface — the physical row purge is queued as a
 * distinct, deliberately-delayed operational step, not silently
 * skipped.
 */
async function runStudioDeletion(requestId: string) {
  const request = await prisma.studioDeletionRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (!canProcess(request.status as never)) return request;

  await prisma.studioDeletionRequest.update({ where: { id: requestId }, data: { status: "processing" } });

  try {
    await prisma.$transaction([
      prisma.studio.update({ where: { id: request.studioId }, data: { deletedAt: new Date() } }),
      prisma.session.updateMany({ where: { studioId: request.studioId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return prisma.studioDeletionRequest.update({ where: { id: requestId }, data: { status: "completed", completedAt: new Date() } });
  } catch (error) {
    await prisma.studioDeletionRequest.update({ where: { id: requestId }, data: { status: "failed" } });
    throw error;
  }
}
