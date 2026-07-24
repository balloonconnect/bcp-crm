# Bulk photo upload

A real chunked/multipart upload pipeline — closes the "studio-side
photo upload is a paste-a-storage-key placeholder" gap flagged in
Prompt 26. Built across `@bcp/upload` (chunk planning, progress/retry
math, duplicate detection, validation), a real S3 multipart expansion
of `@bcp/storage`, `apps/api`'s upload/processing services, and
`apps/studio-web`'s upload panel.

## The upload session is server-owned, not browser-owned

`UploadSession` (+ `UploadChunk` per part) is a real database record
from the moment a file is selected — "persist queue across reloads"
means the *server* remembers what's in flight, not the browser tab.
`GET /galleries/:id/upload-sessions` on mount rebuilds the visible
queue after any reload. What a reload genuinely can't recover is the
actual `File` object's bytes (no browser API persists those) — a
resumed session shows as "needs file" until the same file is reselected,
checksum-verified against the original before any chunk resumes, and
only the chunks that never landed transfer again.

## Duplicate detection before a single byte moves

The client computes a SHA-256 checksum locally (Web Crypto,
`crypto.subtle.digest`) and sends it when creating the session —
checked server-side against both already-delivered `GalleryPhoto`s and
any other session currently uploading the same file for that gallery
(`@bcp/upload`'s `checkDuplicate()`). A duplicate is rejected before an
S3 multipart upload is even initiated, not discovered after wasting
bandwidth.

## Chunk size, multipart mechanics

`resolveChunkSize()` defaults to 8 MiB, growing only if a file is so
large the default would exceed S3's 10,000-part cap, and never drops
below S3's own 5 MiB minimum part size. `@bcp/storage`'s
`createMultipartUpload()`/`getUploadPartUrl()`/`completeMultipartUpload()`/
`abortMultipartUpload()` wrap the real AWS SDK multipart APIs — each
chunk uploads via a presigned PUT URL directly from the browser to
storage, never routing the actual bytes through the API server.

## Pause, resume, retry, network recovery

Pause/resume are a deliberate user-controlled state
(`@bcp/upload`'s `canPause()`/`canResume()`), not a failure. A network
error mid-chunk (dropped Wi-Fi, a flaky mobile connection) pauses that
one file rather than failing the whole queue — retrying only re-sends
chunks that never landed, which is the entire point of chunking a large
upload in the first place. Retry is capped higher than the messaging
channels' cap (5 vs. 3), since a connection dropping mid-upload is a
far more routine failure mode than a WhatsApp/email send failing.

## Wi-Fi preference

Best-effort via the Network Information API
(`navigator.connection` — Chrome/Edge/Android only; Safari and Firefox
don't implement it). When a "Wi-Fi only" toggle is on and the browser
can detect it's off Wi-Fi, the upload pauses itself rather than
burning mobile data; on browsers that can't report network type, the
preference is recorded but can't be enforced, and uploads proceed
rather than blocking on an unknowable condition.

## Generated derivatives

Once every chunk lands, the multipart upload completes and processing
runs server-side (`photo-processing.service.ts`, using `sharp` for
image manipulation and `exifr` for metadata extraction) — generating
everything the brief asks for in one pass: a thumbnail, a preview
(sized for the lightbox), a web version (`GalleryPhoto.compressedKey`),
a blur placeholder (a tiny blurred JPEG re-encoded as a base64 data
URI), and EXIF metadata filtered through an explicit allowlist (camera/
lens/exposure/capture-date fields only — not the full raw tag dump,
which can include GPS coordinates a studio may not realize it's
storing for a client's private event). The "original reference" is
simply the `storageKey` the upload already wrote to; nothing further
is needed there.

## Desktop and mobile capture

Drag-and-drop, a folder picker (`webkitdirectory`), and standard
multi-file selection all funnel through the same `addFiles()` path.
Mobile camera capture uses `<input type="file" capture="environment">`;
photo-library multi-select is the same file input without `capture`.
Private storage and signed URLs are used throughout — every read (chunk
upload target, thumbnail/preview serving) goes through a presigned URL
scoped to one object, never a public bucket.

## Testing

```bash
pnpm --filter @bcp/upload test    # chunk planning, progress, retry, duplicate detection, validation
pnpm --filter @bcp/storage typecheck
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /galleries upload panel
```
