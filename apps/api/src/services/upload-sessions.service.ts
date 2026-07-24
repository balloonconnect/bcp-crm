import crypto from "node:crypto";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { resolveChunkSize, computeTotalChunks, checkDuplicate, canPause, canResume, canRetry } from "@bcp/upload";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { recordActivity } from "./activity-log.service";
import { processCompletedUpload } from "./photo-processing.service";

export class UploadSessionNotFoundError extends Error {
  readonly code = "UPLOAD_SESSION_NOT_FOUND";
  constructor() {
    super("Upload session not found");
    this.name = "UploadSessionNotFoundError";
  }
}

export class DuplicateUploadError extends Error {
  readonly code = "DUPLICATE_UPLOAD";
  constructor(public readonly matchedPhotoId?: string, public readonly matchedSessionId?: string) {
    super(matchedPhotoId ? "This photo is already in the gallery." : "This photo is already being uploaded.");
    this.name = "DuplicateUploadError";
  }
}

export class InvalidUploadStateError extends Error {
  readonly code = "INVALID_UPLOAD_STATE";
  constructor(message: string) {
    super(message);
    this.name = "InvalidUploadStateError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

/** "Persist queue across reloads" — the server, not the browser tab, is the source of truth for what's in flight; a page refresh mid-upload reconstructs its queue by calling this. */
export async function listUploadSessions(studioId: string, galleryId: string) {
  return prisma.uploadSession.findMany({ where: { studioId, galleryId, status: { notIn: ["completed"] } }, orderBy: { createdAt: "asc" } });
}

export async function getUploadSession(studioId: string, sessionId: string) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId }, include: { chunks: { orderBy: { chunkIndex: "asc" } } } });
  if (!session) throw new UploadSessionNotFoundError();
  return session;
}

export interface CreateUploadSessionInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  preferWifi?: boolean;
}

/**
 * Duplicate detection happens here, before a single byte transfers or
 * an S3 multipart upload is even initiated — the checksum the client
 * computed locally is checked against both delivered photos and any
 * other session already uploading the same file, per `@bcp/upload`'s
 * `checkDuplicate()`.
 */
export async function createUploadSession(studioId: string, galleryId: string, input: CreateUploadSessionInput, actorId: string) {
  await assertWithinPlanLimit(studioId, "maxGalleries");

  const [existingPhotos, inFlightSessions] = await Promise.all([
    prisma.galleryPhoto.findMany({ where: { galleryId, checksum: { not: null } }, select: { id: true, checksum: true } }),
    prisma.uploadSession.findMany({ where: { galleryId, status: { notIn: ["completed", "failed"] } }, select: { id: true, checksum: true } }),
  ]);

  const duplicate = checkDuplicate(
    input.checksum,
    existingPhotos.map((p: { id: string; checksum: string | null }) => ({ checksum: p.checksum!, photoId: p.id })),
    inFlightSessions.map((s: { id: string; checksum: string }) => ({ checksum: s.checksum, sessionId: s.id })),
  );
  if (duplicate.isDuplicate) throw new DuplicateUploadError(duplicate.matchedPhotoId, duplicate.matchedSessionId);

  const chunkSize = resolveChunkSize(input.fileSize);
  const totalChunks = computeTotalChunks(input.fileSize, chunkSize);
  const storageKey = `galleries/${galleryId}/originals/${crypto.randomUUID()}-${input.fileName}`;

  const { uploadId } = await getStorageClient().createMultipartUpload(storageKey, input.mimeType);

  const session = await prisma.uploadSession.create({
    data: {
      studioId,
      galleryId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      checksum: input.checksum,
      status: "uploading",
      storageKey,
      multipartUploadId: uploadId,
      chunkSize,
      totalChunks,
      preferWifi: input.preferWifi ?? false,
      createdBy: actorId,
      chunks: { create: Array.from({ length: totalChunks }, (_, i) => ({ chunkIndex: i, sizeBytes: i === totalChunks - 1 ? input.fileSize - i * chunkSize : chunkSize })) },
    },
  });

  await recordActivity({ studioId, actorId, action: "upload.session_created", resourceType: "UploadSession", resourceId: session.id, metadata: { fileName: input.fileName, totalChunks } });
  return session;
}

/** One presigned PUT URL per chunk, fetched lazily as the client is ready to send that chunk — not all generated up front, since a long-paused upload's URLs would expire before they're used. */
export async function getChunkUploadUrl(studioId: string, sessionId: string, chunkIndex: number) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId } });
  if (!session || !session.multipartUploadId) throw new UploadSessionNotFoundError();

  const url = await getStorageClient().getUploadPartUrl(session.storageKey, session.multipartUploadId, chunkIndex + 1); // S3 part numbers are 1-indexed
  return { url };
}

/** Marks one chunk uploaded and, once every chunk has landed, finalizes the multipart upload and kicks off derivative generation — the transition from "uploading" to "processing" happens automatically the moment the last chunk completes, no separate "finish upload" call needed from the client. */
export async function completeChunk(studioId: string, sessionId: string, chunkIndex: number, etag: string, actorId: string) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId }, include: { chunks: true } });
  if (!session) throw new UploadSessionNotFoundError();

  await prisma.uploadChunk.updateMany({ where: { uploadSessionId: sessionId, chunkIndex }, data: { status: "uploaded", etag, uploadedAt: new Date() } });

  const uploadedCount = await prisma.uploadChunk.count({ where: { uploadSessionId: sessionId, status: "uploaded" } });
  await prisma.uploadSession.update({ where: { id: sessionId }, data: { uploadedChunks: uploadedCount } });

  if (uploadedCount < session.totalChunks) return getUploadSession(studioId, sessionId);

  await prisma.uploadSession.update({ where: { id: sessionId }, data: { status: "processing" } });

  const allChunks = await prisma.uploadChunk.findMany({ where: { uploadSessionId: sessionId }, select: { chunkIndex: true, etag: true } });
  await getStorageClient().completeMultipartUpload(
    session.storageKey,
    session.multipartUploadId!,
    allChunks.map((c: { chunkIndex: number; etag: string | null }) => ({ partNumber: c.chunkIndex + 1, etag: c.etag! })),
  );

  await processCompletedUpload(studioId, sessionId, actorId);
  return getUploadSession(studioId, sessionId);
}

export async function pauseUpload(studioId: string, sessionId: string, actorId: string) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId } });
  if (!session) throw new UploadSessionNotFoundError();
  if (!canPause(session.status)) throw new InvalidUploadStateError("This upload can't be paused right now.");

  await prisma.uploadSession.update({ where: { id: sessionId }, data: { status: "paused" } });
  await recordActivity({ studioId, actorId, action: "upload.paused", resourceType: "UploadSession", resourceId: sessionId });
  return getUploadSession(studioId, sessionId);
}

export async function resumeUpload(studioId: string, sessionId: string, actorId: string) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId } });
  if (!session) throw new UploadSessionNotFoundError();
  if (!canResume(session.status)) throw new InvalidUploadStateError("This upload isn't paused.");

  await prisma.uploadSession.update({ where: { id: sessionId }, data: { status: "uploading" } });
  await recordActivity({ studioId, actorId, action: "upload.resumed", resourceType: "UploadSession", resourceId: sessionId });
  return getUploadSession(studioId, sessionId);
}

/** Retrying re-sends only the chunks that never landed — a fresh presigned URL per still-pending chunk, not a restart of the whole file, which is the entire point of chunking a large upload in the first place. */
export async function retryUpload(studioId: string, sessionId: string, actorId: string) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId } });
  if (!session) throw new UploadSessionNotFoundError();
  if (!canRetry(session)) throw new InvalidUploadStateError("This upload can't be retried right now.");

  await prisma.uploadSession.update({ where: { id: sessionId }, data: { status: "uploading", retryCount: { increment: 1 }, failureReason: null } });
  await recordActivity({ studioId, actorId, action: "upload.retried", resourceType: "UploadSession", resourceId: sessionId });
  return getUploadSession(studioId, sessionId);
}

export async function failUpload(studioId: string, sessionId: string, reason: string) {
  await prisma.uploadSession.updateMany({ where: { id: sessionId, studioId }, data: { status: "failed", failureReason: reason } });
}

export async function abortUpload(studioId: string, sessionId: string, actorId: string) {
  const session = await prisma.uploadSession.findFirst({ where: { id: sessionId, studioId } });
  if (!session) throw new UploadSessionNotFoundError();

  if (session.multipartUploadId) await getStorageClient().abortMultipartUpload(session.storageKey, session.multipartUploadId).catch(() => undefined);
  await prisma.uploadSession.delete({ where: { id: sessionId } });
  await recordActivity({ studioId, actorId, action: "upload.aborted", resourceType: "UploadSession", resourceId: sessionId });
}
