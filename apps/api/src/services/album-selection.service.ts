import { prisma } from "@bcp/database";
import { buildExportFilenameList, buildSelectionCsv, canReopen } from "@bcp/selection";
import { recordActivity } from "./activity-log.service";

export class AlbumNotFoundError extends Error {
  readonly code = "ALBUM_NOT_FOUND";
  constructor() {
    super("Album not found");
    this.name = "AlbumNotFoundError";
  }
}

const albumInclude = { categoryLimits: true };

export async function listAlbums(studioId: string, filter?: { status?: string }) {
  return prisma.album.findMany({ where: { studioId, ...(filter?.status ? { status: filter.status as never } : {}) }, orderBy: { createdAt: "desc" } });
}

export async function getAlbum(studioId: string, albumId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId }, include: albumInclude });
  if (!album) throw new AlbumNotFoundError();
  return album;
}

/** Studio-side status transitions after selection closes (design_pending → printing → completed) — distinct from the selection lifecycle itself (open/locked/reopened), which `Album.lockedAt`/`submittedAt` track. */
export async function updateAlbumStatus(studioId: string, albumId: string, status: string, actorId: string) {
  const existing = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!existing) throw new AlbumNotFoundError();

  await prisma.album.update({ where: { id: albumId }, data: { status: status as never } });
  await recordActivity({ studioId, actorId, action: "album.status_changed", resourceType: "Album", resourceId: albumId, metadata: { status } });
  return getAlbum(studioId, albumId);
}

export async function createAlbum(studioId: string, eventId: string, sourceGalleryId: string | undefined, actorId: string) {
  const album = await prisma.album.create({ data: { studioId, eventId, sourceGalleryId, status: "pending_selection" } });
  await recordActivity({ studioId, actorId, action: "album.created", resourceType: "Album", resourceId: album.id });
  return album;
}

export interface AlbumSettingsInput {
  otpRequired?: boolean;
  selectionLimit?: number;
  deadline?: string;
  categoryLimits?: { category: string; limitCount: number }[];
}

export async function updateAlbumSettings(studioId: string, albumId: string, input: AlbumSettingsInput, actorId: string) {
  const existing = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!existing) throw new AlbumNotFoundError();

  await prisma.album.update({ where: { id: albumId }, data: { otpRequired: input.otpRequired, selectionLimit: input.selectionLimit, deadline: input.deadline ? new Date(input.deadline) : undefined, status: "selection_in_progress" } });

  if (input.categoryLimits) {
    await prisma.$transaction([
      prisma.albumCategoryLimit.deleteMany({ where: { albumId } }),
      prisma.albumCategoryLimit.createMany({ data: input.categoryLimits.map((c) => ({ albumId, category: c.category, limitCount: c.limitCount })) }),
    ]);
  }

  await recordActivity({ studioId, actorId, action: "album.settings_updated", resourceType: "Album", resourceId: albumId });
  return getAlbum(studioId, albumId);
}

/** The studio's own view of "Selection history" — every action any client session took, in order. */
export async function getSelectionHistory(studioId: string, albumId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();
  return prisma.albumSelectionHistory.findMany({ where: { albumId }, orderBy: { createdAt: "desc" }, include: { galleryPhoto: { select: { id: true, thumbnailKey: true } } } });
}

export async function getSelectionSummary(studioId: string, albumId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();

  const [selectedCount, favoriteCount, rejectedCount, commentCount] = await Promise.all([
    prisma.albumSelectionItem.count({ where: { albumId, status: "selected" } }),
    prisma.albumSelectionItem.count({ where: { albumId, isFavorite: true } }),
    prisma.albumSelectionItem.count({ where: { albumId, status: "rejected" } }),
    prisma.albumSelectionItem.count({ where: { albumId, comment: { not: null } } }),
  ]);

  return { selectedCount, favoriteCount, rejectedCount, commentCount, selectionLimit: album.selectionLimit, deadline: album.deadline, lockedAt: album.lockedAt, submittedAt: album.submittedAt };
}

async function resolveOriginalFileNames(galleryPhotoIds: string[]): Promise<Map<string, string>> {
  const sessions = await prisma.uploadSession.findMany({ where: { resultingPhotoId: { in: galleryPhotoIds } }, select: { resultingPhotoId: true, fileName: true } });
  const byPhotoId = new Map<string, string>();
  for (const s of sessions as { resultingPhotoId: string | null; fileName: string }[]) if (s.resultingPhotoId) byPhotoId.set(s.resultingPhotoId, s.fileName);
  return byPhotoId;
}

async function getSelectedPhotosForExport(studioId: string, albumId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();

  const items = await prisma.albumSelectionItem.findMany({ where: { albumId, status: "selected" }, orderBy: { updatedAt: "asc" }, include: { galleryPhoto: { select: { id: true, fileKey: true } } } });
  const fileNames = await resolveOriginalFileNames(items.map((i: { galleryPhotoId: string }) => i.galleryPhotoId));

  return items.map((item: { galleryPhotoId: string; isFavorite: boolean; comment: string | null; galleryPhoto: { fileKey: string } }) => ({
    galleryPhotoId: item.galleryPhotoId,
    originalFileName: fileNames.get(item.galleryPhotoId) ?? item.galleryPhoto.fileKey.split("/").pop() ?? item.galleryPhotoId,
    isFavorite: item.isFavorite,
    comment: item.comment,
  }));
}

/** "Export filenames" */
export async function exportSelectionFilenames(studioId: string, albumId: string): Promise<string[]> {
  return buildExportFilenameList(await getSelectedPhotosForExport(studioId, albumId));
}

/** "CSV export" */
export async function exportSelectionCsv(studioId: string, albumId: string): Promise<string> {
  return buildSelectionCsv(await getSelectedPhotosForExport(studioId, albumId));
}

/** "Reopen selection" — a locked album's client-side editing resumes; `Album.reopenedAt` records this happened, distinct from `lockedAt` being cleared, so a studio can see an album was submitted-then-reopened rather than never having been locked at all. */
export async function reopenSelection(studioId: string, albumId: string, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();
  if (!canReopen(album.lockedAt)) throw new Error("This selection isn't locked.");

  await prisma.$transaction([
    prisma.album.update({ where: { id: albumId }, data: { lockedAt: null, reopenedAt: new Date(), status: "selection_in_progress" } }),
    prisma.albumSelectionHistory.create({ data: { albumId, action: "reopened", actorType: "studio" } }),
  ]);

  await recordActivity({ studioId, actorId, action: "album.reopened", resourceType: "Album", resourceId: albumId });
  return getAlbum(studioId, albumId);
}

/** "Reminder" — templated around the actual deadline and how many photos are still needed, distinct from `reminders.service.ts`'s free-text manual reminder. Delivery itself reuses the existing WhatsApp/email send paths, not a new channel. */
export async function sendSelectionReminder(studioId: string, albumId: string, actorId: string, send: (message: string) => Promise<void>) {
  const summary = await getSelectionSummary(studioId, albumId);
  const remaining = summary.selectionLimit ? Math.max(0, summary.selectionLimit - summary.selectedCount) : null;
  const message = `You've selected ${summary.selectedCount} photo(s) so far${remaining !== null ? `, ${remaining} more to go` : ""}.${summary.deadline ? ` Please finish by ${summary.deadline.toLocaleDateString("en-IN")}.` : ""}`;
  await send(message);
  await recordActivity({ studioId, actorId, action: "album.reminder_sent", resourceType: "Album", resourceId: albumId });
}
