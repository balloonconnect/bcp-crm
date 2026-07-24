import crypto from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "@bcp/database";
import { verifyPassword } from "@bcp/auth";
import { checkGalleryAccess, generateOtpCode, isOtpValid, checkDownloadPermission, resolvePhotoVariant, type GuestSessionState } from "@bcp/gallery";
import { sendAuthEmail } from "./notify";
import { GalleryNotFoundError } from "./galleries.service";

export class GalleryAccessDeniedError extends Error {
  readonly code = "GALLERY_ACCESS_DENIED";
  constructor(public readonly reason: string) {
    super(`Gallery access denied: ${reason}`);
    this.name = "GalleryAccessDeniedError";
  }
}

export class InvalidPasswordError extends Error {
  readonly code = "INVALID_GALLERY_PASSWORD";
  constructor() {
    super("Incorrect password");
    this.name = "InvalidPasswordError";
  }
}

export class InvalidOtpError extends Error {
  readonly code = "INVALID_GALLERY_OTP";
  constructor() {
    super("Incorrect or expired code");
    this.name = "InvalidOtpError";
  }
}

export class DownloadNotAllowedError extends Error {
  readonly code = "GALLERY_DOWNLOAD_NOT_ALLOWED";
  constructor(public readonly reason: string) {
    super(reason === "limit_reached" ? "You've reached the download limit for this gallery." : "This download type isn't available for this gallery.");
    this.name = "DownloadNotAllowedError";
  }
}

function newGuestToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

async function resolveGalleryByToken(publicToken: string) {
  const gallery = await prisma.gallery.findUnique({ where: { publicToken } });
  if (!gallery) throw new GalleryNotFoundError();
  return gallery;
}

/** Starts (or resumes) a guest's session against a gallery — always issues a `guestToken` even for an open gallery, since favorites/comments/downloads all need one to attribute to, not just password/OTP-gated galleries. */
export async function startGuestSession(publicToken: string, existingGuestToken: string | undefined, identify?: { guestName?: string; guestPhone?: string; guestEmail?: string }) {
  const gallery = await resolveGalleryByToken(publicToken);
  const studio = await prisma.studio.findUniqueOrThrow({ where: { id: gallery.studioId }, select: { slug: true, name: true } });

  let session = existingGuestToken ? await prisma.galleryAccessSession.findUnique({ where: { guestToken: existingGuestToken } }) : null;
  if (!session || session.galleryId !== gallery.id) {
    session = await prisma.galleryAccessSession.create({ data: { galleryId: gallery.id, guestToken: newGuestToken(), ...identify } });
  } else if (identify) {
    session = await prisma.galleryAccessSession.update({ where: { id: session.id }, data: identify });
  }

  const accessState: GuestSessionState = { passwordVerified: session.passwordVerified, otpVerified: session.otpVerified };
  const accessResult = checkGalleryAccess({ expiresAt: gallery.expiresAt, passwordHash: gallery.passwordHash, otpRequired: gallery.otpRequired }, accessState);

  return { gallery, studio, guestToken: session.guestToken, accessResult };
}

export async function verifyGalleryPassword(publicToken: string, guestToken: string, password: string) {
  const gallery = await resolveGalleryByToken(publicToken);
  if (!gallery.passwordHash || !(await verifyPassword(gallery.passwordHash, password))) throw new InvalidPasswordError();

  await prisma.galleryAccessSession.update({ where: { guestToken }, data: { passwordVerified: true, lastSeenAt: new Date() } });
  return { verified: true };
}

export async function requestGalleryOtp(publicToken: string, guestToken: string) {
  const gallery = await resolveGalleryByToken(publicToken);
  const session = await prisma.galleryAccessSession.findUnique({ where: { guestToken } });
  if (!session) throw new GalleryNotFoundError();

  const code = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.galleryAccessSession.update({ where: { guestToken }, data: { otpCode: code, otpExpiresAt } });

  if (session.guestEmail) {
    await sendAuthEmail({ to: session.guestEmail, subject: `Your gallery access code`, html: `<p>Your code for "${gallery.title ?? "your gallery"}" is <strong>${code}</strong>. It expires in 10 minutes.</p>` }).catch(() => undefined);
  }

  return { sent: Boolean(session.guestEmail) };
}

export async function verifyGalleryOtp(guestToken: string, code: string) {
  const session = await prisma.galleryAccessSession.findUnique({ where: { guestToken } });
  if (!session || !isOtpValid(session.otpCode, session.otpExpiresAt, code)) throw new InvalidOtpError();

  await prisma.galleryAccessSession.update({ where: { guestToken }, data: { otpVerified: true, lastSeenAt: new Date() } });
  return { verified: true };
}

async function requireGrantedAccess(publicToken: string, guestToken: string) {
  const gallery = await resolveGalleryByToken(publicToken);
  const session = await prisma.galleryAccessSession.findUnique({ where: { guestToken } });
  if (!session || session.galleryId !== gallery.id) throw new GalleryAccessDeniedError("no_session");

  const result = checkGalleryAccess({ expiresAt: gallery.expiresAt, passwordHash: gallery.passwordHash, otpRequired: gallery.otpRequired }, { passwordVerified: session.passwordVerified, otpVerified: session.otpVerified });
  if (result !== "granted") throw new GalleryAccessDeniedError(result);

  return { gallery, session };
}

/** The visible photo list for a guest — hidden photos are never returned here regardless of access level, and each photo's `viewUrl` is resolved through `@bcp/gallery`'s `resolvePhotoVariant()` rather than ever handing back the raw storage key for a guest to view unwatermarked. */
export async function listPublicPhotos(publicToken: string, guestToken: string) {
  const { gallery } = await requireGrantedAccess(publicToken, guestToken);
  const photos = await prisma.galleryPhoto.findMany({ where: { galleryId: gallery.id, isHidden: false }, orderBy: { order: "asc" } });

  const favorites = await prisma.galleryFavorite.findMany({ where: { galleryId: gallery.id, guestToken }, select: { photoId: true } });
  const favoritedIds = new Set(favorites.map((f: { photoId: string }) => f.photoId));

  return photos.map((photo: (typeof photos)[number]) => ({
    id: photo.id,
    category: photo.category,
    width: photo.width,
    height: photo.height,
    uploadedAt: photo.uploadedAt,
    viewKey: resolvePhotoVariant(photo, "guest", gallery.watermarkEnabled, "view"),
    isFavorited: favoritedIds.has(photo.id),
  }));
}

export async function toggleFavorite(publicToken: string, guestToken: string, photoId: string) {
  const { gallery } = await requireGrantedAccess(publicToken, guestToken);
  if (!gallery.guestAccessEnabled) throw new GalleryAccessDeniedError("guest_interaction_disabled");

  const existing = await prisma.galleryFavorite.findUnique({ where: { photoId_guestToken: { photoId, guestToken } } });
  if (existing) {
    await prisma.galleryFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  await prisma.galleryFavorite.create({ data: { galleryId: gallery.id, photoId, guestToken } });
  return { favorited: true };
}

export async function addComment(publicToken: string, guestToken: string, input: { photoId?: string; guestName: string; body: string }) {
  const { gallery } = await requireGrantedAccess(publicToken, guestToken);
  if (!gallery.guestAccessEnabled) throw new GalleryAccessDeniedError("guest_interaction_disabled");

  return prisma.galleryComment.create({ data: { galleryId: gallery.id, photoId: input.photoId, guestToken, guestName: input.guestName, body: input.body } });
}

export async function listComments(publicToken: string, guestToken: string) {
  const { gallery } = await requireGrantedAccess(publicToken, guestToken);
  return prisma.galleryComment.findMany({ where: { galleryId: gallery.id }, orderBy: { createdAt: "desc" } });
}

/** Enforces download restrictions before ever handing back a storage key — the `type_disabled`/`limit_reached` reasons `@bcp/gallery`'s `checkDownloadPermission()` returns map directly onto `DownloadNotAllowedError`'s message. */
export async function requestDownload(publicToken: string, guestToken: string, input: { photoId?: string; type: "original" | "compressed" }) {
  const { gallery } = await requireGrantedAccess(publicToken, guestToken);

  const guestDownloadCount = await prisma.galleryDownloadLog.count({ where: { galleryId: gallery.id, guestToken } });
  const permission = checkDownloadPermission(gallery, input.type, guestDownloadCount);
  if (!permission.allowed) throw new DownloadNotAllowedError(permission.reason ?? "not_allowed");

  let storageKey: string | null = null;
  if (input.photoId) {
    const photo = await prisma.galleryPhoto.findFirst({ where: { id: input.photoId, galleryId: gallery.id, isHidden: false } });
    if (!photo) throw new GalleryNotFoundError();
    storageKey = resolvePhotoVariant(photo, "guest", gallery.watermarkEnabled, input.type === "original" ? "download_original" : "download_compressed");
  }

  await prisma.galleryDownloadLog.create({ data: { galleryId: gallery.id, photoId: input.photoId, guestToken, downloadType: input.type } });
  return { storageKey };
}

export async function resolvePhotoImageUrl(publicToken: string, guestToken: string, photoId: string, purpose: "view" | "download_original" | "download_compressed") {
  const { gallery } = await requireGrantedAccess(publicToken, guestToken);
  const photo = await prisma.galleryPhoto.findFirst({ where: { id: photoId, galleryId: gallery.id, isHidden: false } });
  if (!photo) throw new GalleryNotFoundError();

  if (purpose !== "view") {
    const type = purpose === "download_original" ? "original" : "compressed";
    const guestDownloadCount = await prisma.galleryDownloadLog.count({ where: { galleryId: gallery.id, guestToken } });
    const permission = checkDownloadPermission(gallery, type, guestDownloadCount);
    if (!permission.allowed) throw new DownloadNotAllowedError(permission.reason ?? "not_allowed");
  }

  const storageKey = resolvePhotoVariant(photo, "guest", gallery.watermarkEnabled, purpose);
  return { storageKey };
}

export async function generateGalleryQrCode(publicToken: string): Promise<Buffer> {
  const gallery = await resolveGalleryByToken(publicToken);
  const baseUrl = process.env.GALLERY_WEB_BASE_URL ?? "http://localhost:3004";
  const url = `${baseUrl.replace(/\/$/, "")}/g/${gallery.publicToken}`;
  return QRCode.toBuffer(url, { margin: 1, width: 400 });
}
