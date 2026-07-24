import sharp from "sharp";
import * as exifr from "exifr";
import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { recordActivity } from "./activity-log.service";

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

const THUMBNAIL_WIDTH = 400;
const PREVIEW_WIDTH = 1600;
const WEB_WIDTH = 2400;
const BLUR_WIDTH = 24;

/** Only the EXIF fields actually useful to a studio — camera/lens/exposure and the original capture date — not the full raw tag dump, which can include GPS coordinates a studio may not want stored/displayed for a client's private event without knowing it's there. */
const EXIF_ALLOWLIST = ["Make", "Model", "LensModel", "FNumber", "ExposureTime", "ISO", "FocalLength", "DateTimeOriginal"] as const;

function pickAllowedExif(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  const picked: Record<string, unknown> = {};
  for (const key of EXIF_ALLOWLIST) if (raw[key] !== undefined) picked[key] = raw[key];
  return Object.keys(picked).length > 0 ? picked : null;
}

/**
 * Runs once an `UploadSession`'s multipart upload completes — downloads
 * the original, generates every derivative the brief asks for
 * (thumbnail, preview, web version, blur placeholder), extracts EXIF,
 * and creates the resulting `GalleryPhoto`. This is the one place all
 * of "Generate: Thumbnail / Preview / Web version / Original reference
 * / EXIF metadata / Blur placeholder" actually happens — the original
 * reference is simply the `storageKey` the upload already wrote to,
 * nothing further needed there.
 */
export async function processCompletedUpload(studioId: string, sessionId: string, actorId: string) {
  const session = await prisma.uploadSession.findFirstOrThrow({ where: { id: sessionId, studioId } });
  const storage = getStorageClient();

  try {
    const original = await storage.get(session.storageKey);
    const image = sharp(original, { failOn: "none" });
    const metadata = await image.metadata();

    const [thumbnailBuffer, previewBuffer, webBuffer, blurBuffer, exifRaw] = await Promise.all([
      image.clone().resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer(),
      image.clone().resize({ width: PREVIEW_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(),
      image.clone().resize({ width: WEB_WIDTH, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
      image.clone().resize({ width: BLUR_WIDTH }).blur(2).jpeg({ quality: 40 }).toBuffer(),
      exifr.parse(original).catch(() => null) as Promise<Record<string, unknown> | null>,
    ]);

    const baseKey = session.storageKey.replace(/^galleries\//, "").replace(/\/originals\//, "/");
    const thumbnailKey = `galleries/${session.galleryId}/thumbnails/${baseKey}`;
    const previewKey = `galleries/${session.galleryId}/previews/${baseKey}`;
    const compressedKey = `galleries/${session.galleryId}/web/${baseKey}`;

    await Promise.all([
      storage.put(thumbnailKey, thumbnailBuffer, "image/jpeg"),
      storage.put(previewKey, previewBuffer, "image/jpeg"),
      storage.put(compressedKey, webBuffer, "image/jpeg"),
    ]);

    const blurPlaceholder = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;
    const count = await prisma.galleryPhoto.count({ where: { galleryId: session.galleryId } });

    const photo = await prisma.galleryPhoto.create({
      data: {
        studioId,
        galleryId: session.galleryId,
        fileKey: session.storageKey,
        compressedKey,
        thumbnailKey,
        previewKey,
        checksum: session.checksum,
        exifData: pickAllowedExif(exifRaw) ?? undefined,
        blurPlaceholder,
        width: metadata.width,
        height: metadata.height,
        order: count,
        uploadedBy: actorId,
      },
    });

    await prisma.$transaction([
      prisma.uploadSession.update({ where: { id: sessionId }, data: { status: "completed", completedAt: new Date(), resultingPhotoId: photo.id } }),
      prisma.gallery.update({ where: { id: session.galleryId }, data: { photoCount: { increment: 1 }, status: "uploaded" } }),
    ]);

    await recordActivity({ studioId, actorId, action: "gallery.photo_processed", resourceType: "Gallery", resourceId: session.galleryId, metadata: { photoId: photo.id } });
    return photo;
  } catch (error) {
    await prisma.uploadSession.update({ where: { id: sessionId }, data: { status: "failed", failureReason: error instanceof Error ? error.message : "Processing failed" } });
    throw error;
  }
}
