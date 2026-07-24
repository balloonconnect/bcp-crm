import crypto from "node:crypto";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { getFaceProvider } from "./face-provider";
import { recordActivity } from "./activity-log.service";

export class FaceProviderNotConfiguredError extends Error {
  readonly code = "FACE_PROVIDER_NOT_CONFIGURED";
  constructor() {
    super("AWS Rekognition isn't configured for this environment yet.");
    this.name = "FaceProviderNotConfiguredError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

/**
 * One collection per gallery, created lazily the first time a studio
 * turns face search on — never per studio, never shared. This is the
 * structural enforcement behind "no cross-studio search" / "no
 * unauthorized cross-event search": every later search call is handed
 * this exact collection ID and nothing else, so there's no code path
 * that could accidentally widen a search beyond this one gallery.
 */
export async function ensureFaceCollection(studioId: string, galleryId: string) {
  const existing = await prisma.faceCollection.findUnique({ where: { galleryId } });
  if (existing) return existing;

  const provider = getFaceProvider();
  if (!provider) throw new FaceProviderNotConfiguredError();

  const providerCollectionId = `gallery-${galleryId}-${crypto.randomUUID().slice(0, 8)}`;
  await provider.createCollection(providerCollectionId);

  return prisma.faceCollection.create({ data: { studioId, galleryId, providerCollectionId, status: "active" } });
}

export async function enableFaceSearch(studioId: string, galleryId: string, actorId: string) {
  await prisma.gallery.updateMany({ where: { id: galleryId, studioId }, data: { faceSearchEnabled: true } });
  await ensureFaceCollection(studioId, galleryId);
  await recordActivity({ studioId, actorId, action: "face_search.enabled", resourceType: "Gallery", resourceId: galleryId });
  return prisma.gallery.findUnique({ where: { id: galleryId } });
}

export async function updateFaceSearchSettings(studioId: string, galleryId: string, input: { faceSearchEnabled?: boolean; faceSearchConfidenceThreshold?: number; faceSearchRetentionDays?: number }, actorId: string) {
  await prisma.gallery.updateMany({ where: { id: galleryId, studioId }, data: input });
  if (input.faceSearchEnabled) await ensureFaceCollection(studioId, galleryId);
  await recordActivity({ studioId, actorId, action: "face_search.settings_updated", resourceType: "Gallery", resourceId: galleryId });
  return prisma.gallery.findUnique({ where: { id: galleryId } });
}

/** Indexes one delivered photo's faces into the gallery's collection — called once per photo (from the upload pipeline, when face search is on for the gallery) rather than at search time, so a guest's search is fast and doesn't wait on indexing every photo in the gallery. */
export async function indexPhotoFaces(studioId: string, galleryId: string, galleryPhotoId: string) {
  const provider = getFaceProvider();
  if (!provider) throw new FaceProviderNotConfiguredError();

  const collection = await ensureFaceCollection(studioId, galleryId);
  const photo = await prisma.galleryPhoto.findFirstOrThrow({ where: { id: galleryPhotoId, galleryId } });

  const imageBytes = await getStorageClient().get(photo.compressedKey ?? photo.fileKey);
  const faces = await provider.indexFacesInImage(collection.providerCollectionId, imageBytes);

  if (faces.length === 0) return [];

  await prisma.faceIndexEntry.createMany({
    data: faces.map((f) => ({ faceCollectionId: collection.id, galleryPhotoId, providerFaceId: f.providerFaceId, boundingBox: f.boundingBox, confidence: f.confidence })),
  });

  return faces;
}

export async function getFaceSearchUsage(studioId: string, galleryId: string) {
  const [sessionCount, indexedFaceCount, consentCount] = await Promise.all([
    prisma.faceSearchSession.count({ where: { studioId, galleryId } }),
    prisma.faceIndexEntry.count({ where: { faceCollection: { galleryId } } }),
    prisma.faceConsentLog.count({ where: { galleryId } }),
  ]);
  return { sessionCount, indexedFaceCount, consentCount };
}

/** "Privacy logs" — the studio's own view of every consent recorded for a gallery, for compliance review. */
export async function listConsentLogs(studioId: string, galleryId: string) {
  return prisma.faceConsentLog.findMany({ where: { studioId, galleryId }, orderBy: { consentedAt: "desc" } });
}
