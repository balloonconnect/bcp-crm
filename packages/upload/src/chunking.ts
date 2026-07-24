const MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MiB — S3 multipart's own minimum part size (except the final part)
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB — a reasonable balance between request overhead and resumability granularity
const MAX_PARTS = 10_000; // S3 multipart's own hard cap

/** Picks a chunk size for a given file — the default unless the file is so large that the default would exceed S3's 10,000-part cap, in which case the chunk size grows just enough to stay under it. Never returns something below S3's own 5 MiB minimum part size. */
export function resolveChunkSize(fileSizeBytes: number): number {
  if (fileSizeBytes / DEFAULT_CHUNK_SIZE <= MAX_PARTS) return DEFAULT_CHUNK_SIZE;
  const grown = Math.ceil(fileSizeBytes / MAX_PARTS);
  return Math.max(MIN_CHUNK_SIZE, grown);
}

export function computeTotalChunks(fileSizeBytes: number, chunkSize: number): number {
  return Math.max(1, Math.ceil(fileSizeBytes / chunkSize));
}

export interface ChunkRange {
  index: number;
  start: number;
  end: number; // exclusive
}

/** The byte range for one chunk, 0-indexed — what the browser slices out of the file with `File.slice()` before uploading that piece. */
export function resolveChunkRange(chunkIndex: number, chunkSize: number, fileSizeBytes: number): ChunkRange {
  const start = chunkIndex * chunkSize;
  const end = Math.min(start + chunkSize, fileSizeBytes);
  return { index: chunkIndex, start, end };
}
