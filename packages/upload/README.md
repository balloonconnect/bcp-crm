# @bcp/upload

Pure logic for the bulk photo upload pipeline: chunk-size planning
(matched to S3 multipart's own constraints), progress aggregation,
pause/resume/retry state rules, and checksum-based duplicate detection.
No database or storage access — `apps/api`'s `upload-sessions.service.ts`
orchestrates real S3 multipart calls (`@bcp/storage`) using these
functions' decisions; `apps/studio-web`'s `useUploadQueue` hook drives
the actual chunk-by-chunk upload loop client-side.

## What's here

```
src/
  chunking.ts        resolveChunkSize(), computeTotalChunks(),
                    resolveChunkRange() — 8 MiB default, grows only to
                    stay under S3's 10,000-part cap, never below its
                    5 MiB minimum
  progress.ts           computeUploadProgress(), summarizeQueue() —
                    both derived from chunk counts, not a separately
                    tracked byte counter
  retry.ts                 canRetry() (capped at 5, higher than the
                    messaging channels' 3 — dropped connections are a
                    more routine failure mode here), canPause(),
                    canResume()
  duplicate.ts                checkDuplicate() — checked before any
                    bytes transfer, against both delivered photos and
                    other in-flight sessions
  validation.ts                 createUploadSessionSchema,
                    requestUploadSchema (with a supported-MIME-type
                    allowlist), uploadChunkCompleteSchema
  index.ts                      barrel export
```

See [docs/bulk-photo-upload.md](../../docs/bulk-photo-upload.md) for
the full design — what "persist queue across reloads" means given
browsers can't persist raw `File` bytes across a reload, and how
network recovery/Wi-Fi preference are handled.

## Testing

```bash
pnpm --filter @bcp/upload test
pnpm --filter @bcp/upload typecheck
pnpm --filter @bcp/upload lint
```
