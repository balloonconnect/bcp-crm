import crypto from "node:crypto";
import { Worker, type Job } from "bullmq";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface BackupJobData {
  jobRecordId: string;
  studioId: string;
  backupId: string; // the StudioBackup row (Prompt 41), already approved by a Platform Admin before this job is ever enqueued
}

const env = getEnv();
const storage = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });

function getEncryptionKey(): Buffer {
  if (!env.BACKUP_ENCRYPTION_KEY) throw new Error("BACKUP_ENCRYPTION_KEY is not configured — backups are unavailable, not silently unencrypted, until it is.");
  const raw = env.BACKUP_ENCRYPTION_KEY;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256.");
  return key;
}

/** Same AES-256-GCM scheme as `apps/api`'s backup service (Prompt 41) — an authenticated cipher, so corruption or tampering fails loudly on decrypt rather than silently restoring garbage. Duplicated rather than imported cross-app (apps/api and apps/worker are separate deployables), but it's a small, self-contained function, unlike the heavier import/export services this pass left un-duplicated. */
function encrypt(plaintext: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

/**
 * The actual encrypted full-studio backup generation — queued so a
 * large studio's snapshot doesn't run inline in the approval request.
 * By the time this job is enqueued, a Platform Admin has already
 * approved it (`StudioBackup.status === "approved"`); this worker only
 * ever runs the mechanical snapshot-and-encrypt step, never the
 * approval decision itself.
 */
export const backupWorker = new Worker<BackupJobData>(
  "backup",
  (job: Job<BackupJobData>) =>
    withJobTracking("backup", job, async () => {
      const { studioId, backupId } = job.data;

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

      const snapshot = { snapshotTakenAt: new Date().toISOString(), studioId, clients, leads, events, bookings, quotations, invoices, galleries, albums };
      const encrypted = encrypt(Buffer.from(JSON.stringify(snapshot), "utf-8"));

      const fileKey = `backups/${studioId}/${backupId}.enc`;
      await storage.put(fileKey, encrypted, "application/octet-stream");

      await prisma.studioBackup.update({ where: { id: backupId }, data: { status: "completed", fileKey, sizeBytes: encrypted.length, encryptionKeyId: "primary", completedAt: new Date() } });

      return { fileKey, sizeBytes: encrypted.length };
    }),
  { connection },
);
