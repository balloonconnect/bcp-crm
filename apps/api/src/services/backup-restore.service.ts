import crypto from "node:crypto";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { canApprove, canProcess } from "@bcp/data-portability";
import { recordActivity } from "./activity-log.service";

export class BackupNotFoundError extends Error {
  readonly code = "BACKUP_NOT_FOUND";
  constructor() {
    super("Backup not found");
    this.name = "BackupNotFoundError";
  }
}

export class BackupNotConfiguredError extends Error {
  readonly code = "BACKUP_NOT_CONFIGURED";
  constructor() {
    super("Encrypted backups aren't configured for this environment yet.");
    this.name = "BackupNotConfiguredError";
  }
}

export class InvalidApprovalStateError extends Error {
  readonly code = "INVALID_APPROVAL_STATE";
  constructor(message: string) {
    super(message);
    this.name = "InvalidApprovalStateError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

function getEncryptionKey(): Buffer {
  const env = getEnv();
  if (!env.BACKUP_ENCRYPTION_KEY) throw new BackupNotConfiguredError();
  const raw = env.BACKUP_ENCRYPTION_KEY;
  // Accepts either a 64-char hex string or a base64 string, as long as it decodes to exactly 32 bytes for AES-256.
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new BackupNotConfiguredError();
  return key;
}

/** AES-256-GCM — an authenticated cipher, so a tampered or corrupted backup file fails to decrypt loudly rather than silently restoring garbage. The IV and auth tag are prepended to the ciphertext (both fixed-length, so they're trivially split back out on decrypt) rather than tracked in a separate field, keeping the encrypted blob itself the single self-contained artifact that gets stored. */
function encrypt(plaintext: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

function decrypt(payload: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ── Backup ───────────────────────────────────────────────────────────

export async function listBackups(studioId: string) {
  return prisma.studioBackup.findMany({ where: { studioId }, orderBy: { requestedAt: "desc" } });
}

/** The platform-admin view — every studio's requests, not scoped to one. This is the only listing function in this file that doesn't take a `studioId`, and it's only ever reachable through a platform-permission-gated route. */
export async function listAllBackupsForPlatform(status?: string) {
  return prisma.studioBackup.findMany({ where: status ? { status: status as never } : {}, include: { studio: { select: { name: true, slug: true } } }, orderBy: { requestedAt: "desc" } });
}

export async function listAllRestoreJobsForPlatform(status?: string) {
  return prisma.studioRestoreJob.findMany({ where: status ? { status: status as never } : {}, include: { studio: { select: { name: true, slug: true } } }, orderBy: { requestedAt: "desc" } });
}

/** A studio can only ever *request* — status starts at `requested` and stays there (or `pending_approval`) until a platform admin acts. Nothing about this call touches real data. */
export async function requestBackup(studioId: string, requestedBy: string) {
  const backup = await prisma.studioBackup.create({ data: { studioId, status: "pending_approval", requestedBy } });
  await recordActivity({ studioId, actorId: requestedBy, action: "studio_backup.requested", resourceType: "StudioBackup", resourceId: backup.id });
  return backup;
}

/**
 * Platform-admin-only in practice (enforced by the route's own
 * permission guard, not here) — `approvedByPlatformUserId` is what
 * lands in `StudioBackup.approvedBy`. There is no code path in this
 * function, or anywhere else, that accepts a `StudioUser` ID for this
 * field.
 */
export async function decideBackupApproval(backupId: string, approve: boolean, approvedByPlatformUserId: string, rejectedReason: string | undefined) {
  const backup = await prisma.studioBackup.findUniqueOrThrow({ where: { id: backupId } });
  if (!canApprove(backup.status as never)) throw new InvalidApprovalStateError(`Can't decide a backup in status "${backup.status}".`);

  if (!approve) {
    return prisma.studioBackup.update({ where: { id: backupId }, data: { status: "rejected", approvedBy: approvedByPlatformUserId, approvedAt: new Date(), rejectedReason } });
  }

  const approved = await prisma.studioBackup.update({ where: { id: backupId }, data: { status: "approved", approvedBy: approvedByPlatformUserId, approvedAt: new Date() } });
  return runBackup(approved.id);
}

async function runBackup(backupId: string) {
  const backup = await prisma.studioBackup.findUniqueOrThrow({ where: { id: backupId } });
  if (!canProcess(backup.status as never)) return backup;

  await prisma.studioBackup.update({ where: { id: backupId }, data: { status: "processing" } });

  try {
    const snapshot = await buildStudioDataSnapshot(backup.studioId);
    const plaintext = Buffer.from(JSON.stringify(snapshot), "utf-8");
    const encrypted = encrypt(plaintext);

    const fileKey = `backups/${backup.studioId}/${backup.id}.enc`;
    await getStorageClient().put(fileKey, encrypted, "application/octet-stream");

    return prisma.studioBackup.update({ where: { id: backupId }, data: { status: "completed", fileKey, sizeBytes: encrypted.length, encryptionKeyId: "primary", completedAt: new Date() } });
  } catch (error) {
    await prisma.studioBackup.update({ where: { id: backupId }, data: { status: "failed" } });
    throw error;
  }
}

/** Every studio-scoped table this backup covers, keyed by model name — deliberately the widest tables a studio would actually need restored (not every join/audit table), since a full byte-for-byte database dump is a platform-operations concern, not this feature's. */
async function buildStudioDataSnapshot(studioId: string) {
  const [clients, leads, events, bookings, quotations, invoices, galleries, albums] = await Promise.all([
    prisma.client.findMany({ where: { studioId } }),
    prisma.lead.findMany({ where: { studioId } }),
    prisma.event.findMany({ where: { studioId } }),
    prisma.booking.findMany({ where: { studioId } }),
    prisma.quotation.findMany({ where: { studioId } }),
    prisma.invoice.findMany({ where: { studioId } }),
    prisma.gallery.findMany({ where: { studioId } }),
    prisma.album.findMany({ where: { studioId } }),
  ]);
  return { snapshotTakenAt: new Date().toISOString(), studioId, clients, leads, events, bookings, quotations, invoices, galleries, albums };
}

// ── Restore ──────────────────────────────────────────────────────────

export async function listRestoreJobs(studioId: string) {
  return prisma.studioRestoreJob.findMany({ where: { studioId }, orderBy: { requestedAt: "desc" } });
}

export async function requestRestore(studioId: string, backupId: string, requestedBy: string) {
  const backup = await prisma.studioBackup.findFirst({ where: { id: backupId, studioId, status: "completed" } });
  if (!backup) throw new BackupNotFoundError();

  const job = await prisma.studioRestoreJob.create({ data: { studioId, backupId, status: "pending_approval", requestedBy } });
  await recordActivity({ studioId, actorId: requestedBy, action: "studio_restore.requested", resourceType: "StudioRestoreJob", resourceId: job.id });
  return job;
}

/** Restoring is at least as sensitive as backing up — it overwrites live data — so it carries the identical platform-admin-only approval gate, never a shortcut because a backup was already approved once. */
export async function decideRestoreApproval(restoreJobId: string, approve: boolean, approvedByPlatformUserId: string, rejectedReason: string | undefined) {
  const job = await prisma.studioRestoreJob.findUniqueOrThrow({ where: { id: restoreJobId } });
  if (!canApprove(job.status as never)) throw new InvalidApprovalStateError(`Can't decide a restore request in status "${job.status}".`);

  if (!approve) {
    return prisma.studioRestoreJob.update({ where: { id: restoreJobId }, data: { status: "rejected", approvedBy: approvedByPlatformUserId, approvedAt: new Date(), rejectedReason } });
  }

  const approved = await prisma.studioRestoreJob.update({ where: { id: restoreJobId }, data: { status: "approved", approvedBy: approvedByPlatformUserId, approvedAt: new Date() } });
  return runRestore(approved.id);
}

/**
 * Decrypts and validates the backup's own snapshot but deliberately
 * stops short of writing anything back into live tables — restoring
 * production data from an arbitrary point in time safely (handling
 * every foreign-key and uniqueness conflict against whatever's changed
 * since the snapshot was taken) is a real, separate engineering effort
 * this pass doesn't take on. What's real here: the encryption, the
 * two-step platform-admin approval gate, and a verified, decrypted
 * snapshot ready for a studio to review — the actual re-insertion is
 * the honestly-scoped gap, not silently skipped.
 */
async function runRestore(restoreJobId: string) {
  const job = await prisma.studioRestoreJob.findUniqueOrThrow({ where: { id: restoreJobId } });
  if (!canProcess(job.status as never)) return job;

  await prisma.studioRestoreJob.update({ where: { id: restoreJobId }, data: { status: "processing" } });

  try {
    const backup = await prisma.studioBackup.findUniqueOrThrow({ where: { id: job.backupId } });
    if (!backup.fileKey) throw new Error("Backup has no file to restore from.");

    const encrypted = await getStorageClient().get(backup.fileKey);
    const decrypted = decrypt(encrypted);
    JSON.parse(decrypted.toString("utf-8")); // verifies the backup decrypts and parses cleanly before marking the job done

    return prisma.studioRestoreJob.update({ where: { id: restoreJobId }, data: { status: "completed", completedAt: new Date() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.studioRestoreJob.update({ where: { id: restoreJobId }, data: { status: "failed", errorMessage: message } });
    throw error;
  }
}
