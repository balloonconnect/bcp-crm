export type DownloadType = "original" | "compressed";

export interface DownloadPermissionConfig {
  allowOriginalDownload: boolean;
  allowCompressedDownload: boolean;
  downloadLimitPerGuest: number | null;
}

export interface DownloadCheckResult {
  allowed: boolean;
  reason?: "type_disabled" | "limit_reached";
}

/** Checks both dimensions of "download restriction" the brief names: whether this specific type (original vs. compressed) is allowed at all, and whether this guest has hit their per-gallery download cap. A null limit means unlimited — checked separately from 0, since a studio explicitly setting the limit to 0 is a real, if unusual, choice (view-only gallery) that shouldn't be conflated with "no limit configured." */
export function checkDownloadPermission(config: DownloadPermissionConfig, type: DownloadType, guestDownloadCountSoFar: number): DownloadCheckResult {
  if (type === "original" && !config.allowOriginalDownload) return { allowed: false, reason: "type_disabled" };
  if (type === "compressed" && !config.allowCompressedDownload) return { allowed: false, reason: "type_disabled" };
  if (config.downloadLimitPerGuest !== null && guestDownloadCountSoFar >= config.downloadLimitPerGuest) return { allowed: false, reason: "limit_reached" };
  return { allowed: true };
}
