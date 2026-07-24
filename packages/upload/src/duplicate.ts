export interface ExistingChecksum {
  checksum: string;
  photoId?: string;
  sessionId?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedPhotoId?: string;
  matchedSessionId?: string;
}

/**
 * Checked *before* a single byte of the file is uploaded — the
 * client computes a SHA-256 checksum locally and this function checks
 * it against both already-delivered `GalleryPhoto`s and any other
 * `UploadSession` currently in flight for the same gallery, so
 * uploading the same photo twice (a common mistake when re-selecting a
 * folder) never wastes bandwidth or storage. A duplicate against a
 * completed photo and a duplicate against an in-progress session are
 * distinguished so the caller can word the message differently ("already
 * in this gallery" vs. "already uploading").
 */
export function checkDuplicate(checksum: string, existingPhotoChecksums: ExistingChecksum[], inFlightSessionChecksums: ExistingChecksum[]): DuplicateCheckResult {
  const photoMatch = existingPhotoChecksums.find((c) => c.checksum === checksum);
  if (photoMatch) return { isDuplicate: true, matchedPhotoId: photoMatch.photoId };

  const sessionMatch = inFlightSessionChecksums.find((c) => c.checksum === checksum);
  if (sessionMatch) return { isDuplicate: true, matchedSessionId: sessionMatch.sessionId };

  return { isDuplicate: false };
}
