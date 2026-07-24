export interface SelectedPhotoForExport {
  galleryPhotoId: string;
  originalFileName: string; // the original upload's filename, from GalleryPhoto/UploadSession
  isFavorite: boolean;
  comment: string | null;
}

/** "Export filenames" — a plain sequence-numbered list of the selected photos' *original* filenames (not the studio's internal storage keys), the format a lab or designer actually needs to pull the right files from the original shoot folder. Sequence number reflects selection order, 1-indexed for a human-facing list. */
export function buildExportFilenameList(photos: SelectedPhotoForExport[]): string[] {
  return photos.map((photo, index) => `${index + 1}. ${photo.originalFileName}`);
}

/** "CSV export" — one row per selected photo, quoting only the free-text comment field (the only value that could contain a comma or quote) per standard CSV escaping. */
export function buildSelectionCsv(photos: SelectedPhotoForExport[]): string {
  const header = "Sequence,Filename,Favorite,Comment";
  const rows = photos.map((photo, index) => {
    const comment = photo.comment ? `"${photo.comment.replace(/"/g, '""')}"` : "";
    return [index + 1, photo.originalFileName, photo.isFavorite ? "Yes" : "No", comment].join(",");
  });
  return [header, ...rows].join("\n");
}
