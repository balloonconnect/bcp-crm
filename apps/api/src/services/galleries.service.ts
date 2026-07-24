import { prisma } from "@bcp/database";
import { hashPassword } from "@bcp/auth";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";
import { recordActivity } from "./activity-log.service";

export class GalleryNotFoundError extends Error {
  readonly code = "GALLERY_NOT_FOUND";
  constructor() {
    super("Gallery not found");
    this.name = "GalleryNotFoundError";
  }
}

const galleryInclude = { photos: { orderBy: { order: "asc" as const } } };

export async function listGalleries(studioId: string, filter?: { status?: string }) {
  return prisma.gallery.findMany({ where: { studioId, ...(filter?.status ? { status: filter.status as never } : {}) }, include: { photos: { select: { id: true }, take: 1 } }, orderBy: { createdAt: "desc" } });
}

export async function getGallery(studioId: string, galleryId: string) {
  const gallery = await prisma.gallery.findFirst({ where: { id: galleryId, studioId }, include: galleryInclude });
  if (!gallery) throw new GalleryNotFoundError();
  return gallery;
}

export interface GalleryInput {
  eventId?: string;
  branchId?: string;
  title?: string;
  description?: string;
  layout?: string;
  password?: string;
  otpRequired?: boolean;
  expiresAt?: string;
  guestAccessEnabled?: boolean;
  allowOriginalDownload?: boolean;
  allowCompressedDownload?: boolean;
  downloadLimitPerGuest?: number;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  coverPhotoId?: string;
}

export async function createGallery(studioId: string, eventId: string, input: Omit<GalleryInput, "eventId">, actorId: string) {
  await assertWithinPlanLimit(studioId, "maxGalleries");

  const { password, ...rest } = input;
  const gallery = await prisma.gallery.create({
    data: { studioId, eventId, status: "pending_upload", ...rest, layout: input.layout as never, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, passwordHash: password ? await hashPassword(password) : undefined },
  });

  await recordActivity({ studioId, actorId, action: "gallery.created", resourceType: "Gallery", resourceId: gallery.id });
  return gallery;
}

export async function updateGallery(studioId: string, galleryId: string, input: Partial<GalleryInput>, actorId: string) {
  const existing = await prisma.gallery.findFirst({ where: { id: galleryId, studioId } });
  if (!existing) throw new GalleryNotFoundError();

  const { password, ...rest } = input;
  await prisma.gallery.updateMany({
    where: { id: galleryId, studioId },
    data: { ...rest, layout: input.layout as never, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, passwordHash: password ? await hashPassword(password) : undefined },
  });

  await recordActivity({ studioId, actorId, action: "gallery.updated", resourceType: "Gallery", resourceId: galleryId });
  return getGallery(studioId, galleryId);
}

export async function markGalleryDelivered(studioId: string, galleryId: string, actorId: string) {
  await prisma.gallery.updateMany({ where: { id: galleryId, studioId }, data: { status: "delivered", deliveredAt: new Date() } });
  await recordActivity({ studioId, actorId, action: "gallery.delivered", resourceType: "Gallery", resourceId: galleryId });
  return getGallery(studioId, galleryId);
}

// ── Photos ───────────────────────────────────────────────────────────

export interface PhotoInput {
  fileKey: string;
  compressedKey?: string;
  thumbnailKey?: string;
  width?: number;
  height?: number;
  category?: string;
}

export async function addPhoto(studioId: string, galleryId: string, input: PhotoInput, actorId: string) {
  const gallery = await prisma.gallery.findFirst({ where: { id: galleryId, studioId } });
  if (!gallery) throw new GalleryNotFoundError();

  const count = await prisma.galleryPhoto.count({ where: { galleryId } });
  const photo = await prisma.galleryPhoto.create({ data: { studioId, galleryId, order: count, uploadedBy: actorId, ...input } });

  await prisma.gallery.update({ where: { id: galleryId }, data: { photoCount: { increment: 1 }, status: "uploaded" } });
  await recordActivity({ studioId, actorId, action: "gallery.photo_added", resourceType: "Gallery", resourceId: galleryId });
  return photo;
}

export async function updatePhoto(studioId: string, galleryId: string, photoId: string, input: { category?: string; isHidden?: boolean; order?: number }, actorId: string) {
  await prisma.galleryPhoto.updateMany({ where: { id: photoId, galleryId, studioId }, data: input });
  await recordActivity({ studioId, actorId, action: "gallery.photo_updated", resourceType: "Gallery", resourceId: galleryId, metadata: { photoId } });
  return prisma.galleryPhoto.findUnique({ where: { id: photoId } });
}

export async function removePhoto(studioId: string, galleryId: string, photoId: string, actorId: string) {
  await prisma.galleryPhoto.deleteMany({ where: { id: photoId, galleryId, studioId } });
  await prisma.gallery.update({ where: { id: galleryId }, data: { photoCount: { decrement: 1 } } });
  await recordActivity({ studioId, actorId, action: "gallery.photo_removed", resourceType: "Gallery", resourceId: galleryId, metadata: { photoId } });
}

export async function getGalleryStats(studioId: string, galleryId: string) {
  const gallery = await prisma.gallery.findFirst({ where: { id: galleryId, studioId } });
  if (!gallery) throw new GalleryNotFoundError();

  const [favoriteCount, commentCount, downloadCount, uniqueGuestCount] = await Promise.all([
    prisma.galleryFavorite.count({ where: { galleryId } }),
    prisma.galleryComment.count({ where: { galleryId } }),
    prisma.galleryDownloadLog.count({ where: { galleryId } }),
    prisma.galleryAccessSession.count({ where: { galleryId } }),
  ]);

  return { favoriteCount, commentCount, downloadCount, uniqueGuestCount };
}
