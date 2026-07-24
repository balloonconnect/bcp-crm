# @bcp/album-production

Pure logic for the album design production pipeline: the 11-stage
transition graph (not strictly linear — revision requests loop back),
spread versioning, revision-limit checks, full-album-approval
readiness, and the e-album's own password/OTP access gate. No database
access — `apps/api`'s `album-production.service.ts` (studio-side),
`album-production-public.service.ts` (client review), and
`ealbum.service.ts` (the 3D viewer) do the actual reading/writing.

## What's here

```
src/
  stages.ts              ALBUM_PRODUCTION_STAGES (11 stages),
                        canTransition() — an explicit adjacency map,
                        since the pipeline loops (revision → design_started
                        or → client_review)
  versioning.ts             resolveNextVersionNumber() — per spread
                        number independently
  revisions.ts                 hasReachedRevisionLimit(),
                        resolveNextRoundNumber()
  approval.ts                     canApproveFullAlbum() — every
                        current spread must individually be approved
  access.ts                          checkEAlbumAccess() — password
                        before OTP, same fixed order as
                        @bcp/gallery's gate, no expiry concept
  validation.ts                        assignDesignerSchema, uploadSpreadSchema,
                        spreadCommentSchema, spreadApprovalSchema,
                        revisionRequestSchema, printOrderInputSchema,
                        courierInputSchema, eAlbumSettingsSchema, etc.
  index.ts                                barrel export
```

See [docs/album-design-and-ealbum.md](../../docs/album-design-and-ealbum.md)
for the full design — why production stage and selection status are
two separate dimensions on the same `Album`, and why the e-album link
is deliberately independent of the selection link.

## Testing

```bash
pnpm --filter @bcp/album-production test
pnpm --filter @bcp/album-production typecheck
pnpm --filter @bcp/album-production lint
```
