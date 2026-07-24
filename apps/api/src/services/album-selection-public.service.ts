import crypto from "node:crypto";
import { prisma } from "@bcp/database";
import { generateOtpCode, isOtpValid } from "@bcp/gallery";
import { checkAlbumAccess, checkSelectionLimit, checkCategoryLimit, canEditSelection, canSubmit } from "@bcp/selection";
import { sendAuthEmail } from "./notify";
import { AlbumNotFoundError } from "./album-selection.service";

export class AlbumAccessDeniedError extends Error {
  readonly code = "ALBUM_ACCESS_DENIED";
  constructor(public readonly reason: string) {
    super(`Album access denied: ${reason}`);
    this.name = "AlbumAccessDeniedError";
  }
}

export class InvalidAlbumOtpError extends Error {
  readonly code = "INVALID_ALBUM_OTP";
  constructor() {
    super("Incorrect or expired code");
    this.name = "InvalidAlbumOtpError";
  }
}

export class SelectionLockedError extends Error {
  readonly code = "SELECTION_LOCKED";
  constructor() {
    super("This selection has been submitted and locked. Ask the studio to reopen it if you need to make changes.");
    this.name = "SelectionLockedError";
  }
}

export class SelectionLimitReachedError extends Error {
  readonly code = "SELECTION_LIMIT_REACHED";
  constructor(public readonly reason: string) {
    super(reason === "category_limit_reached" ? "You've reached the limit for this category." : "You've reached the overall selection limit.");
    this.name = "SelectionLimitReachedError";
  }
}

function newGuestToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

async function resolveAlbumByToken(publicToken: string) {
  const album = await prisma.album.findUnique({ where: { publicToken } });
  if (!album) throw new AlbumNotFoundError();
  return album;
}

export async function startGuestSession(publicToken: string, existingGuestToken: string | undefined, identify?: { guestName?: string; guestPhone?: string; guestEmail?: string }) {
  const album = await resolveAlbumByToken(publicToken);
  const studio = await prisma.studio.findUniqueOrThrow({ where: { id: album.studioId }, select: { slug: true, name: true } });

  let session = existingGuestToken ? await prisma.albumAccessSession.findUnique({ where: { guestToken: existingGuestToken } }) : null;
  if (!session || session.albumId !== album.id) {
    session = await prisma.albumAccessSession.create({ data: { albumId: album.id, guestToken: newGuestToken(), ...identify } });
  } else if (identify) {
    session = await prisma.albumAccessSession.update({ where: { id: session.id }, data: identify });
  }

  const accessResult = checkAlbumAccess(album.otpRequired, session.otpVerified);
  return { album, studio, guestToken: session.guestToken, accessResult };
}

export async function requestAlbumOtp(publicToken: string, guestToken: string) {
  const album = await resolveAlbumByToken(publicToken);
  const session = await prisma.albumAccessSession.findUnique({ where: { guestToken } });
  if (!session) throw new AlbumNotFoundError();

  const code = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.albumAccessSession.update({ where: { guestToken }, data: { otpCode: code, otpExpiresAt } });

  if (session.guestEmail) {
    await sendAuthEmail({ to: session.guestEmail, subject: "Your album selection access code", html: `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>` }).catch(() => undefined);
  }

  return { sent: Boolean(session.guestEmail), albumTitle: album.id };
}

export async function verifyAlbumOtp(guestToken: string, code: string) {
  const session = await prisma.albumAccessSession.findUnique({ where: { guestToken } });
  if (!session || !isOtpValid(session.otpCode, session.otpExpiresAt, code)) throw new InvalidAlbumOtpError();

  await prisma.albumAccessSession.update({ where: { guestToken }, data: { otpVerified: true, lastSeenAt: new Date() } });
  return { verified: true };
}

async function requireGrantedAccess(publicToken: string, guestToken: string) {
  const album = await resolveAlbumByToken(publicToken);
  const session = await prisma.albumAccessSession.findUnique({ where: { guestToken } });
  if (!session || session.albumId !== album.id) throw new AlbumAccessDeniedError("no_session");

  const result = checkAlbumAccess(album.otpRequired, session.otpVerified);
  if (result !== "granted") throw new AlbumAccessDeniedError(result);

  return { album, session };
}

/** The selectable pool — every non-hidden photo in the album's source gallery, with this guest's own current verdict on each. */
export async function listSelectablePhotos(publicToken: string, guestToken: string) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  if (!album.sourceGalleryId) return [];

  const photos = await prisma.galleryPhoto.findMany({ where: { galleryId: album.sourceGalleryId, isHidden: false }, orderBy: { order: "asc" } });
  const items = await prisma.albumSelectionItem.findMany({ where: { albumId: album.id, guestToken } });
  const itemByPhoto = new Map(items.map((i: { galleryPhotoId: string }) => [i.galleryPhotoId, i]));

  return photos.map((photo: { id: string; category: string | null; thumbnailKey: string | null; previewKey: string | null }) => {
    const item = itemByPhoto.get(photo.id) as { status: string; isFavorite: boolean; comment: string | null } | undefined;
    return { id: photo.id, category: photo.category, status: item?.status ?? "pending", isFavorite: item?.isFavorite ?? false, comment: item?.comment ?? null };
  });
}

async function assertLimitsAllow(albumId: string, galleryPhotoId: string) {
  const album = await prisma.album.findUniqueOrThrow({ where: { id: albumId } });
  const selectedCount = await prisma.albumSelectionItem.count({ where: { albumId, status: "selected" } });

  const overall = checkSelectionLimit(selectedCount, album.selectionLimit);
  if (!overall.allowed) throw new SelectionLimitReachedError(overall.reason!);

  const photo = await prisma.galleryPhoto.findUnique({ where: { id: galleryPhotoId }, select: { category: true } });
  if (photo?.category) {
    const categoryLimit = await prisma.albumCategoryLimit.findUnique({ where: { albumId_category: { albumId, category: photo.category } } });
    if (categoryLimit) {
      const categoryCount = await prisma.albumSelectionItem.count({ where: { albumId, status: "selected", galleryPhoto: { category: photo.category } } });
      const result = checkCategoryLimit(categoryCount, categoryLimit.limitCount);
      if (!result.allowed) throw new SelectionLimitReachedError(result.reason!);
    }
  }
}

/** Select / deselect / favorite / unfavorite / reject — every mutation checks the lock first (nothing changes on a submitted selection without a studio reopening it), then, for `select` specifically, both limit dimensions before the change is allowed to land. Every action appends one `AlbumSelectionHistory` row regardless of outcome, so "Selection history" is a complete record of intent, not just final state. */
export async function applySelectionAction(publicToken: string, guestToken: string, galleryPhotoId: string, action: "select" | "deselect" | "favorite" | "unfavorite" | "reject") {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  if (!canEditSelection(album.lockedAt)) throw new SelectionLockedError();

  if (action === "select") await assertLimitsAllow(album.id, galleryPhotoId);

  const statusUpdate: Record<string, { status?: "pending" | "selected" | "rejected"; isFavorite?: boolean }> = {
    select: { status: "selected" },
    deselect: { status: "pending" },
    reject: { status: "rejected" },
    favorite: { isFavorite: true },
    unfavorite: { isFavorite: false },
  };

  await prisma.albumSelectionItem.upsert({
    where: { albumId_galleryPhotoId: { albumId: album.id, galleryPhotoId } },
    update: statusUpdate[action],
    create: { albumId: album.id, galleryPhotoId, guestToken, ...statusUpdate[action] },
  });

  const historyAction = { select: "selected", deselect: "deselected", favorite: "favorited", unfavorite: "unfavorited", reject: "rejected" }[action] as never;
  await prisma.albumSelectionHistory.create({ data: { albumId: album.id, galleryPhotoId, action: historyAction, guestToken, actorType: "client" } });

  return prisma.albumSelectionItem.findUnique({ where: { albumId_galleryPhotoId: { albumId: album.id, galleryPhotoId } } });
}

export async function addComment(publicToken: string, guestToken: string, galleryPhotoId: string, comment: string) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  if (!canEditSelection(album.lockedAt)) throw new SelectionLockedError();

  const item = await prisma.albumSelectionItem.upsert({
    where: { albumId_galleryPhotoId: { albumId: album.id, galleryPhotoId } },
    update: { comment },
    create: { albumId: album.id, galleryPhotoId, guestToken, comment },
  });
  await prisma.albumSelectionHistory.create({ data: { albumId: album.id, galleryPhotoId, action: "commented", guestToken, actorType: "client" } });
  return item;
}

/** "Submit" + "Lock selection" — one action: submitting a selection is what locks it. `Album.submittedAt`/`lockedAt` are set together, never independently, since there's no meaningful "submitted but not locked" state in this workflow. */
export async function submitSelection(publicToken: string, guestToken: string) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  if (!canSubmit(album.lockedAt)) throw new SelectionLockedError();

  const now = new Date();
  await prisma.$transaction([
    prisma.album.update({ where: { id: album.id }, data: { submittedAt: now, lockedAt: now, status: "design_pending" } }),
    prisma.albumSelectionHistory.create({ data: { albumId: album.id, action: "submitted", guestToken, actorType: "client" } }),
    prisma.albumSelectionHistory.create({ data: { albumId: album.id, action: "locked", guestToken, actorType: "client" } }),
  ]);

  return prisma.album.findUniqueOrThrow({ where: { id: album.id } });
}

/** Resolves the storage key for one photo within this album's own selectable pool — never an arbitrary key a client could otherwise request signed. A preview/compressed variant is preferred for browsing, the same "never show a guest the raw original while just viewing" rule galleries already follow; the true original is only ever handed out through `getSelectedOriginalKeys()`, and only once selected. */
export async function resolveSelectablePhotoKey(publicToken: string, guestToken: string, galleryPhotoId: string): Promise<string> {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  if (!album.sourceGalleryId) throw new AlbumNotFoundError();

  const photo = await prisma.galleryPhoto.findFirst({ where: { id: galleryPhotoId, galleryId: album.sourceGalleryId, isHidden: false } });
  if (!photo) throw new AlbumNotFoundError();

  return photo.previewKey ?? photo.compressedKey ?? photo.thumbnailKey ?? photo.fileKey;
}

/** "Download selected originals" — every selected photo's true original, never the compressed/watermarked variant a guest browsing the source gallery would see. */
export async function getSelectedOriginalKeys(publicToken: string, guestToken: string): Promise<{ galleryPhotoId: string; fileKey: string }[]> {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  const items = await prisma.albumSelectionItem.findMany({ where: { albumId: album.id, status: "selected" }, include: { galleryPhoto: { select: { id: true, fileKey: true } } } });
  return items.map((i: { galleryPhoto: { id: string; fileKey: string } }) => ({ galleryPhotoId: i.galleryPhoto.id, fileKey: i.galleryPhoto.fileKey }));
}
