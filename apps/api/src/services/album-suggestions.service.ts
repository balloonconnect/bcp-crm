import { prisma } from "@bcp/database";
import { balanceMomentCategories, suggestAlbumSequence, selectCoverPhoto } from "@bcp/culling";
import { recordActivity } from "./activity-log.service";

export class AlbumSuggestionNotFoundError extends Error {
  readonly code = "ALBUM_SUGGESTION_NOT_FOUND";
  constructor() {
    super("Album suggestion not found");
    this.name = "AlbumSuggestionNotFoundError";
  }
}

/**
 * Builds one album proposal from a gallery's analyzed photos —
 * preferring the survivors of the most recent completed culling
 * session (photos the AI recommended `include`, or that a studio
 * explicitly approved) when one exists, falling back to every
 * analyzed photo otherwise. Composes three `@bcp/culling` functions in
 * a fixed order: balance the candidate pool across moment categories
 * down to the target count, sequence the result chronologically, then
 * recommend a cover from within that final selection.
 */
export async function startAlbumSuggestion(studioId: string, galleryId: string, presetType: string, targetPhotoCount: number, actorId: string) {
  const latestCulling = await prisma.cullingSession.findFirst({ where: { studioId, galleryId, status: "completed" }, orderBy: { createdAt: "desc" }, include: { recommendations: true } });

  const candidatePhotoIds = latestCulling
    ? latestCulling.recommendations.filter((r: { recommendation: string; status: string }) => r.recommendation === "include" || r.status === "approved").map((r: { galleryPhotoId: string }) => r.galleryPhotoId)
    : null;

  const photos = await prisma.galleryPhoto.findMany({
    where: { studioId, galleryId, isHidden: false, ...(candidatePhotoIds ? { id: { in: candidatePhotoIds } } : {}) },
    include: { photoAnalysis: true },
  });

  const withAnalysis = (photos as { id: string; uploadedAt: Date; photoAnalysis: { qualityScore: number; sceneClassification: string | null; subjectProminenceScore: number; faceCount: number } | null }[]).filter((p) => p.photoAnalysis);

  const importantFaceIds = latestCulling?.importantFaceIds ?? [];
  const featuredPhotoIds = importantFaceIds.length > 0 ? new Set((await prisma.faceIndexEntry.findMany({ where: { providerFaceId: { in: importantFaceIds }, galleryPhoto: { galleryId } }, select: { galleryPhotoId: true } })).map((e: { galleryPhotoId: string }) => e.galleryPhotoId)) : null;

  const balanced = balanceMomentCategories(
    withAnalysis.map((p) => ({ galleryPhotoId: p.id, momentCategory: p.photoAnalysis!.sceneClassification ?? "uncategorized", qualityScore: p.photoAnalysis!.qualityScore })),
    Math.min(targetPhotoCount, withAnalysis.length),
  );

  const selectedSet = new Set(balanced);
  const selectedPhotos = withAnalysis.filter((p) => selectedSet.has(p.id));

  const sequence = suggestAlbumSequence(selectedPhotos.map((p) => ({ galleryPhotoId: p.id, uploadedAt: p.uploadedAt })));
  const coverPhotoId = selectCoverPhoto(
    selectedPhotos.map((p) => ({ galleryPhotoId: p.id, qualityScore: p.photoAnalysis!.qualityScore, subjectProminenceScore: p.photoAnalysis!.subjectProminenceScore, featuresImportantPerson: featuredPhotoIds?.has(p.id) ?? false })),
  );

  const suggestion = await prisma.albumSuggestion.create({ data: { studioId, galleryId, presetType: presetType as never, targetPhotoCount, status: "completed", completedAt: new Date(), createdBy: actorId } });

  const photoRows = sequence.map((galleryPhotoId, index) => {
    const photo = selectedPhotos.find((p) => p.id === galleryPhotoId)!;
    return {
      albumSuggestionId: suggestion.id,
      galleryPhotoId,
      sequenceOrder: index,
      isCoverRecommendation: galleryPhotoId === coverPhotoId,
      momentCategory: photo.photoAnalysis!.sceneClassification,
      reason: galleryPhotoId === coverPhotoId ? "Recommended cover — strong quality and subject prominence." : `Selected for the ${photo.photoAnalysis!.sceneClassification ?? "uncategorized"} moment balance.`,
      confidence: photo.photoAnalysis!.qualityScore,
    };
  });

  if (photoRows.length > 0) await prisma.albumSuggestionPhoto.createMany({ data: photoRows });

  await recordActivity({ studioId, actorId, action: "album_suggestion.completed", resourceType: "Gallery", resourceId: galleryId, metadata: { suggestionId: suggestion.id, photoCount: photoRows.length } });
  return getAlbumSuggestion(studioId, suggestion.id);
}

export async function getAlbumSuggestion(studioId: string, suggestionId: string) {
  const suggestion = await prisma.albumSuggestion.findFirst({
    where: { id: suggestionId, studioId },
    include: { photos: { orderBy: { sequenceOrder: "asc" }, include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } } } } },
  });
  if (!suggestion) throw new AlbumSuggestionNotFoundError();
  return suggestion;
}

export async function listAlbumSuggestions(studioId: string, galleryId: string) {
  return prisma.albumSuggestion.findMany({ where: { studioId, galleryId }, orderBy: { createdAt: "desc" } });
}

export async function reviewAlbumPhoto(studioId: string, albumSuggestionPhotoId: string, status: "approved" | "rejected") {
  const photo = await prisma.albumSuggestionPhoto.findFirst({ where: { id: albumSuggestionPhotoId, albumSuggestion: { studioId } } });
  if (!photo) throw new Error("Album suggestion photo not found");
  return prisma.albumSuggestionPhoto.update({ where: { id: albumSuggestionPhotoId }, data: { status } });
}

/** A studio's manual override of the recommended cover — exactly one photo per suggestion is ever flagged, enforced here (not the schema) the same way `Gallery.coverPhotoId` is a single pointer rather than a constraint. */
export async function setAlbumCover(studioId: string, suggestionId: string, galleryPhotoId: string, actorId: string) {
  const suggestion = await prisma.albumSuggestion.findFirst({ where: { id: suggestionId, studioId } });
  if (!suggestion) throw new AlbumSuggestionNotFoundError();

  await prisma.$transaction([
    prisma.albumSuggestionPhoto.updateMany({ where: { albumSuggestionId: suggestionId }, data: { isCoverRecommendation: false } }),
    prisma.albumSuggestionPhoto.updateMany({ where: { albumSuggestionId: suggestionId, galleryPhotoId }, data: { isCoverRecommendation: true } }),
  ]);

  await recordActivity({ studioId, actorId, action: "album_suggestion.cover_changed", resourceType: "AlbumSuggestion", resourceId: suggestionId, metadata: { galleryPhotoId } });
  return getAlbumSuggestion(studioId, suggestionId);
}

/** Re-sequences the album — a studio dragging photos into their own order, replacing the AI's chronological suggestion for just this photo's position. */
export async function reorderAlbumPhoto(studioId: string, suggestionId: string, albumSuggestionPhotoId: string, newOrder: number, actorId: string) {
  const suggestion = await prisma.albumSuggestion.findFirst({ where: { id: suggestionId, studioId } });
  if (!suggestion) throw new AlbumSuggestionNotFoundError();

  await prisma.albumSuggestionPhoto.update({ where: { id: albumSuggestionPhotoId }, data: { sequenceOrder: newOrder } });
  await recordActivity({ studioId, actorId, action: "album_suggestion.reordered", resourceType: "AlbumSuggestion", resourceId: suggestionId });
  return getAlbumSuggestion(studioId, suggestionId);
}
