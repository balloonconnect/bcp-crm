# @bcp/gallery

Pure logic for public photo galleries: the access gate (password/OTP/
expiry), download permission checks, photo-variant resolution
(watermark/compression/original), the 5-layout registry, and
validation. No database access — `apps/api`'s `gallery-public.service.ts`
gathers real gallery/session/photo data and hands it to these
functions; `apps/gallery-web` imports `groupPhotosByDay()` directly for
the timeline layout.

## What's here

```
src/
  access.ts               checkGalleryAccess() — expiry, then password,
                         then OTP, in that fixed order; generateOtpCode(),
                         isOtpValid()
  download-permissions.ts    checkDownloadPermission() — type-disabled
                         vs. limit-reached, checked separately
  variant.ts                   resolvePhotoVariant() — the one function
                         every photo-serving path calls; studio users
                         always get the true original, guests get the
                         watermarked/compressed variant when viewing
  layouts.ts                     GALLERY_LAYOUTS (5 layouts),
                         groupPhotosByDay() for the Timeline layout
  validation.ts                     galleryInputSchema, photoUploadInputSchema,
                         commentInputSchema, downloadRequestSchema, etc.
  index.ts                          barrel export
```

See [docs/photo-gallery.md](../../docs/photo-gallery.md) for the full
design — why favorites/comments are keyed by an opaque guest token
instead of an account, and what's a deliberate v1 simplification
(studio-side photo upload, real pixel-level watermarking).

## Testing

```bash
pnpm --filter @bcp/gallery test
pnpm --filter @bcp/gallery typecheck
pnpm --filter @bcp/gallery lint
```
