export interface PhotoKeys {
  fileKey: string;
  compressedKey: string | null;
  thumbnailKey: string | null;
  watermarkedKey: string | null;
}

export type ViewerRole = "studio_user" | "guest";

/**
 * Resolves which stored object a given request should actually
 * receive — the one function every photo-serving code path (viewer
 * grid, lightbox, download) should call rather than each picking a key
 * independently. A studio user always sees the true, unwatermarked
 * original (their own work); a guest sees the watermarked variant when
 * one exists and watermarking is on, falling back to the compressed
 * variant, and only the plain original as a last resort if neither
 * derived variant was ever generated.
 */
export function resolvePhotoVariant(photo: PhotoKeys, role: ViewerRole, watermarkEnabled: boolean, purpose: "view" | "download_original" | "download_compressed"): string {
  if (role === "studio_user") {
    if (purpose === "download_compressed" && photo.compressedKey) return photo.compressedKey;
    return photo.fileKey;
  }

  if (purpose === "download_original") return photo.fileKey;
  if (purpose === "download_compressed") return photo.compressedKey ?? photo.fileKey;

  // purpose === "view": guests browsing the gallery see the watermarked/compressed variant, never the raw original, regardless of download settings — viewing and downloading are different permissions.
  if (watermarkEnabled && photo.watermarkedKey) return photo.watermarkedKey;
  return photo.compressedKey ?? photo.thumbnailKey ?? photo.fileKey;
}
