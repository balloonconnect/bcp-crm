/** The 5 layouts named in the brief. `groupBy` documents how `apps/gallery-web` arranges photos for each — most of the actual visual difference is CSS (masonry's variable-height columns vs. grid's fixed cells), but "story" and "timeline" also change the *data* shape (chronological sequence, day-grouped) the frontend requests, which is why it's captured here rather than left as a pure styling decision. */
export const GALLERY_LAYOUTS = [
  { key: "grid", label: "Grid", groupBy: "none" },
  { key: "masonry", label: "Masonry", groupBy: "none" },
  { key: "story", label: "Story", groupBy: "sequence" },
  { key: "timeline", label: "Timeline", groupBy: "day" },
  { key: "highlights", label: "Highlights", groupBy: "favorites_first" },
] as const;

export type GalleryLayoutKey = (typeof GALLERY_LAYOUTS)[number]["key"];

export interface PhotoForLayout {
  id: string;
  uploadedAt: Date;
  order: number;
}

/** Groups photos by calendar day for the Timeline layout — the one layout whose grouping is genuinely data-shaped rather than pure CSS. */
export function groupPhotosByDay<T extends PhotoForLayout>(photos: T[]): { dateKey: string; photos: T[] }[] {
  const sorted = [...photos].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  const groups = new Map<string, T[]>();
  for (const photo of sorted) {
    const dateKey = photo.uploadedAt.toISOString().slice(0, 10);
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), photo]);
  }
  return [...groups.entries()].map(([dateKey, groupPhotos]) => ({ dateKey, photos: groupPhotos }));
}
