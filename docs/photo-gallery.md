# Photo gallery

Expands the Prompt 11 "status tracker" `Gallery` into the real public
gallery product — built across `@bcp/gallery` (access control, download
permissions, photo-variant resolution, layout registry, validation),
`apps/api`'s studio-management and public routes, `apps/studio-web`'s
`/galleries` page, and — the primary deliverable — `apps/gallery-web`,
the actual guest-facing viewer at `/g/[token]`.

## Unique link, QR code, custom domain

`Gallery.publicToken` is the unique link, resolved by `apps/gallery-web`
the same way `Quotation.publicToken` is resolved by the client portal —
opaque, not the row's own UUID. `GET /galleries/:id/qr` renders it as a
PNG via the same `qrcode` package every other QR feature in this
codebase uses. Studio branding is applied client-side once the guest
session reveals which studio the gallery belongs to, via the same
`/public/branding` endpoint and `themeToCssVariables()` helper
`apps/client-portal` already uses for quotations and enquiry forms —
including whatever custom domain the platform's existing domain
resolution serves the link on, since branding resolution doesn't care
which hostname the request arrived through.

## Password, OTP, expiry — one access gate

`@bcp/gallery`'s `checkGalleryAccess()` is the single function every
gallery request passes through: expiry always wins first regardless of
an otherwise-valid session, then password, then OTP — a gallery can
require both, checked in that fixed order so a guest is prompted for
one thing at a time. A guest's progress through the gate
(`GalleryAccessSession`) is identified by an opaque `guestToken`
persisted in the browser's `localStorage`, not a login — the same
"session without an account" pattern `QuotationAccessCode` established
for public quotation approval (Prompt 16).

## Original vs. compressed download, restrictions, watermark

`@bcp/gallery`'s `resolvePhotoVariant()` is the one function every
photo-serving code path calls — a studio user always sees the true
original; a guest *viewing* the gallery sees the watermarked or
compressed variant, never the raw original, regardless of what
download permissions say (viewing and downloading are different
questions). `checkDownloadPermission()` enforces both dimensions of
"download restriction": whether a type (original/compressed) is
enabled at all, and whether a guest has hit their per-gallery download
cap — every download creates a `GalleryDownloadLog` row, which is what
the cap counts against.

## Favorites, comments, sharing

`GalleryFavorite`/`GalleryComment` are both keyed by `guestToken`, not
an account — a guest interacting with a gallery never needs to sign up
for anything. Sharing is entirely client-side: the lightbox's share
button uses the Web Share API where available (native share sheets on
mobile), falling back to copying a link to the clipboard — no
`GalleryShareLog` model, since there's nothing server-side to track
about a share action itself.

## Layouts

Grid, masonry, story, timeline, and highlights all render through one
`PhotoGrid` component — the visual difference between grid, masonry,
and story is almost entirely CSS (fixed cells vs. variable-height
columns vs. a single swipeable column). Timeline is the one layout
with a genuinely different *data* shape, grouped by calendar day via
`@bcp/gallery`'s `groupPhotosByDay()`; highlights simply reorders the
same photo list favorites-first.

## Mobile

Swipe (lightbox navigation) and pinch-zoom (scale via two-finger touch
distance, double-tap to toggle 2×) are both implemented directly on
raw touch events rather than a library — the gesture surface needed
here is small enough not to justify a new dependency. Native share
uses `navigator.share()`. Every `<img>` uses native `loading="lazy"`
and a `sizes` attribute tuned to the grid's actual column count at each
breakpoint, so a phone requests an appropriately small file rather than
a full desktop-width image — "lazy loading" and "responsive image
sizes" from the brief, without a custom intersection observer.

## Known simplification

Studio-side photo upload started as a "paste a storage key" flow in
this phase and was replaced by a real chunked/multipart pipeline in
Prompt 27 — see [docs/bulk-photo-upload.md](bulk-photo-upload.md).
Actual pixel-level watermarking (compositing text onto an image) is
still out of scope: `Gallery.watermarkEnabled`/`watermarkText` are
real, stored settings, and `resolvePhotoVariant()` already accounts for
a `watermarkedKey` when one exists, but the upload pipeline's
derivative generation (thumbnail/preview/web/blur, via `sharp`) doesn't
yet produce that watermarked variant — a studio can turn watermarking
on today, but guests currently fall back to the compressed variant
until that compositing step is added.

## Testing

```bash
pnpm --filter @bcp/gallery test   # access gate, download permissions, variant resolution, layouts
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /galleries
pnpm --filter @bcp/gallery-web build  # /g/[token]
```
