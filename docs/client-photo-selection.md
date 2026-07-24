# Client photo selection

Expands `Album` from the Prompt 11 status tracker into the real
client-facing selection experience — a secure OTP-gated link where a
client picks which delivered photos go into their final album, with
limits, a deadline, and a genuine lock/reopen lifecycle. Built across
`@bcp/selection` (access gating, limit checks, lock/reopen/submit state,
CSV/filename export — all pure), `apps/api`'s studio-management and
public selection routes, `apps/studio-web`'s album settings panel, and
`apps/client-portal`'s `/select/[token]` mobile-first selection flow.

## Selection is its own workflow, not gallery viewing

`Album.sourceGalleryId` points at the delivered `Gallery` whose photos
are selectable — deliberately a separate model and workflow from
Prompt 26's gallery browsing, since a client picking album photos and a
guest browsing/favoriting/downloading the same event are different
audiences with different rules (a selection has a limit and a
deadline; a gallery view doesn't). `AlbumAccessSession` mirrors
`GalleryAccessSession`'s "opaque token, no account required" shape as
its own model, since the two are answering different access questions
even when the same person holds both.

## Secure link, OTP

Simpler than gallery access: a selection link only ever gates on OTP
(`@bcp/selection`'s `checkAlbumAccess()`), never a password — there's
no equivalent brief requirement here the way Prompt 26 named a
password option for galleries.

## Selection limit, category limits

Both checked independently, in the same request, so a client learns
*which* limit stopped them (`@bcp/selection`'s `checkSelectionLimit()`/
`checkCategoryLimit()`) — a null limit means unlimited, checked
separately from an explicit 0, the same convention `@bcp/gallery`'s
download limit already established.

## Favorite, select, deselect, reject — independent, not a single state

`AlbumSelectionItem.isFavorite` is deliberately independent of
`status` — a client can favorite a photo as a personal shortlist
marker without it counting toward the selection limit, and can select
a photo without favoriting it. The brief lists them as separate actions
because they answer different questions ("do I love this" vs. "is this
going in the album").

## Selection history

`AlbumSelectionHistory` is append-only and independent of
`AlbumSelectionItem`'s current-state row — a photo can be selected,
deselected, and reselected several times before submission; the
current state only shows where it landed, this is the full story of
how it got there. Lock and reopen are album-level entries in the same
log (`galleryPhotoId` is null for those), so a studio's own view of
"selection history" is one continuous timeline, not two separate logs
to cross-reference.

## Submit locks; only a studio reopens

Submitting **is** locking — `Album.submittedAt`/`lockedAt` are set
together in one transaction, since there's no meaningful "submitted
but still open" state in this workflow. Every selection mutation
checks the lock first (`@bcp/selection`'s `canEditSelection()`); a
locked album genuinely stops accepting changes, it's not advisory.
Reopening is deliberately a studio-only action recorded with its own
`reopenedAt` timestamp, distinct from the lock simply never having been
set.

## Export filenames, CSV export, download selected originals

All three operate only on `status: "selected"` items, ordered by when
they were selected. Filenames are resolved from the original upload's
own `UploadSession.fileName` (Prompt 27) — the name a lab or designer
actually needs, not the studio's internal storage key — falling back to
the storage key's basename for any photo that predates the real upload
pipeline. Downloads hand back the true original `fileKey`, never the
compressed/preview variant a client browsed while selecting.

## Mobile: large thumbnails, sticky count, full-screen viewer, resume, confirm

The selection grid is capped at 2–3 columns even on the smallest
phones — never a dense grid that makes tapping the right photo
error-prone. A sticky bottom bar keeps the running selected count (and
the submit action) visible while scrolling a long gallery. The
full-screen viewer supports swipe navigation the same way the gallery
lightbox does (Prompt 26). "Resume later" is real: the guest token is
persisted in `localStorage`, so closing the tab and coming back later
resumes the same session, OTP verification included, without starting
over. Final submission always requires an explicit confirmation
dialog, since it locks the whole selection.

## Testing

```bash
pnpm --filter @bcp/selection test   # access, limits, lock/reopen/submit state, CSV/filename export
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /albums settings + history + export
pnpm --filter @bcp/client-portal build  # /select/[token] mobile-first selection flow
```
