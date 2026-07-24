export interface PhotoForSequence {
  galleryPhotoId: string;
  uploadedAt: Date;
}

/** "Suggest album sequence" — chronological order by capture time, the honest default for event photography: a wedding/birthday/corporate album's natural narrative arc *is* the order things actually happened, not something a separate "story arc" model needs to invent. */
export function suggestAlbumSequence(photos: PhotoForSequence[]): string[] {
  return [...photos].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime()).map((p) => p.galleryPhotoId);
}

export interface PhotoForCover {
  galleryPhotoId: string;
  qualityScore: number;
  subjectProminenceScore: number;
  featuresImportantPerson: boolean;
}

/** "Recommend cover" — the highest-quality, most subject-prominent photo, strongly preferring one that features an important person (the actual subject of the event) over an equally sharp but peripheral detail shot. */
export function selectCoverPhoto(photos: PhotoForCover[]): string | null {
  if (photos.length === 0) return null;
  const ranked = [...photos].sort((a, b) => {
    const scoreA = a.qualityScore * 0.5 + a.subjectProminenceScore * 0.3 + (a.featuresImportantPerson ? 20 : 0);
    const scoreB = b.qualityScore * 0.5 + b.subjectProminenceScore * 0.3 + (b.featuresImportantPerson ? 20 : 0);
    return scoreB - scoreA;
  });
  return ranked[0]!.galleryPhotoId;
}

export interface PhotoForBalance {
  galleryPhotoId: string;
  momentCategory: string;
  qualityScore: number;
}

/**
 * "Balance people and rituals" — rather than simply taking the top-N
 * photos by quality (which could easily fill an album with 40 ceremony
 * shots and zero reception candids if the ceremony happened to be
 * better-lit), this allocates the target count *proportionally* across
 * the categories actually present, then fills each category's
 * allocation with its own highest-quality photos. A category with only
 * a handful of photos never gets padded past what it actually has;
 * leftover slots roll over to the next-largest category rather than
 * going unused.
 */
export function balanceMomentCategories(photos: PhotoForBalance[], targetCount: number): string[] {
  const byCategory = new Map<string, PhotoForBalance[]>();
  for (const photo of photos) {
    const list = byCategory.get(photo.momentCategory) ?? [];
    list.push(photo);
    byCategory.set(photo.momentCategory, list);
  }
  for (const list of byCategory.values()) list.sort((a, b) => b.qualityScore - a.qualityScore);

  const categories = [...byCategory.keys()];
  const baseAllocation = Math.floor(targetCount / categories.length);
  const selected: string[] = [];
  let remaining = targetCount;

  for (const category of categories) {
    const pool = byCategory.get(category)!;
    const take = Math.min(baseAllocation, pool.length);
    selected.push(...pool.slice(0, take).map((p) => p.galleryPhotoId));
    remaining -= take;
  }

  // Distribute leftover slots (from under-filled categories, or rounding) to whichever category still has unused photos, highest quality first across the whole remaining pool.
  if (remaining > 0) {
    const usedIds = new Set(selected);
    const leftoverPool = photos.filter((p) => !usedIds.has(p.galleryPhotoId)).sort((a, b) => b.qualityScore - a.qualityScore);
    selected.push(...leftoverPool.slice(0, remaining).map((p) => p.galleryPhotoId));
  }

  return selected;
}
