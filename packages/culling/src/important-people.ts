export interface FaceOccurrence {
  providerFaceId: string;
  galleryPhotoId: string;
}

export interface RankedFace {
  providerFaceId: string;
  photoCount: number;
}

/**
 * "Identify important people" when a studio hasn't manually flagged
 * anyone — ranks faces by how many photos they appear in. The people
 * who appear across the most photos in an event gallery are, by
 * construction, almost always the actual subjects of the event (the
 * couple, the birthday child, the graduate) rather than incidental
 * guests who show up in one or two frames. Manual flagging (a
 * studio's own `importantFaceIds`) always takes precedence when
 * provided — this is only the fallback.
 */
export function rankImportantFaces(occurrences: FaceOccurrence[], topN = 5): RankedFace[] {
  const counts = new Map<string, Set<string>>();
  for (const occ of occurrences) {
    const photos = counts.get(occ.providerFaceId) ?? new Set<string>();
    photos.add(occ.galleryPhotoId);
    counts.set(occ.providerFaceId, photos);
  }

  return [...counts.entries()]
    .map(([providerFaceId, photos]) => ({ providerFaceId, photoCount: photos.size }))
    .sort((a, b) => b.photoCount - a.photoCount)
    .slice(0, topN);
}
