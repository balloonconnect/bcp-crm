# Album design and 3D e-album

The album production workflow that picks up once Prompt 31's client
selection locks — designer assignment through delivery, versioned
spread proofing with page comments/annotations/approval, revision
rounds against a limit, whole-album approval, print specs/lab/courier
tracking, and a separate secure, OTP/password-gated 3D e-album viewer
with WhatsApp share and download control. Built across
`@bcp/album-production` (stage transitions, versioning, revision
limits, approval readiness, e-album access — all pure),
`apps/api`'s studio-side and client-facing routes, `apps/studio-web`'s
production panel, and `apps/gallery-web`'s `/ealbum/[token]` page-flip
viewer.

## Two separate lifecycle dimensions on the same `Album`

`AlbumStatus` (Prompt 31: pending_selection → selection_in_progress →
design_pending → printing → completed) answers "is the client still
picking photos." `AlbumProductionStage` — the 11 stages this prompt
adds — answers "where is the physical/digital album itself in
production." Kept as two separate enums rather than one combined one,
so a detailed production pipeline never has to reinterpret the coarser
selection-lifecycle enum other code already depends on.

## The pipeline isn't strictly linear

`@bcp/album-production`'s `canTransition()` is an explicit adjacency
map, not a "next index" function — `revision_requested` can loop back
to `design_started` (a new proof round) or straight to `client_review`
(a quick revised proof), both legitimate next steps the same current
stage can lead to.

## Spread upload and versioning are the same mechanism

Every upload to a given `spreadNumber` gets the next version number
for *that spread specifically* — `resolveNextVersionNumber()` tracks
each spread's own count independently. Only one version per spread
number is ever `isCurrent`; the previous one's flag flips off in the
same transaction a new version is created in, never as a separate
step.

## Page comments and annotations are the same model

`AlbumSpreadComment.positionX`/`positionY` set means a pinned
annotation on a specific spot; left null means a general comment about
the page as a whole — no separate annotation model, since an
annotation is structurally just a comment that knows where it's
pointing.

## Full album approval requires every current spread's own approval

`canApproveFullAlbum()` won't pass while any current spread sits in
`revision_requested` — a studio can't mark the whole album approved
while a client's page-level feedback is still unresolved. Only the
*current* version of each spread number is checked; an old, superseded
version's status is irrelevant once replaced.

## Revision limits

`Album.revisionLimit` (null = unlimited) is checked against
`AlbumRevisionRequest`'s own count — a round is consumed the moment
it's requested, regardless of how it's resolved. `resolveNextRoundNumber()`
is what numbers each round for the client-facing revision-status view.

## Print specifications, lab details, courier tracking

`PrintOrder.printSpecification` is a JSON blob (size, paper stock,
binding, cover material) rather than typed columns — the same
"studio/lab-specific, not worth a fixed schema" reasoning `PlanLimits`
and branding tokens already use elsewhere. Dispatching a print order
(courier name + tracking number) and marking it delivered both advance
the album's own production stage in the same transaction, so a studio
never updates the two separately.

## 3D e-album: a genuinely separate link from selection

`Album.eAlbumToken` is its own token, its own password hash, its own
OTP toggle, its own download-enabled flag — deliberately independent
of the Prompt 31 selection link, since the finished e-album is
typically shared far more widely (the brief specifically names
WhatsApp share) than a selection link ever would be. WhatsApp share
routes through the platform's own send path (Prompt 24), tracked the
same way every other outbound message is, not a bare `wa.me` link a
studio builds by hand.

## The viewer itself

`apps/gallery-web`'s `/ealbum/[token]` — a CSS 3D-perspective page-flip
transition driven by swipe (mobile) or arrow buttons (desktop), reusing
the exact touch-delta gesture and pinch-to-zoom scale-transform
approach the gallery lightbox (Prompt 26) already established, applied
per-page instead of per-photo. Studio branding resolves through the
same `/public/branding` endpoint every other public surface already
uses. Download is gated by the studio's own `eAlbumDownloadEnabled`
toggle — off means the button doesn't even appear, not just a
disabled one.

## Testing

```bash
pnpm --filter @bcp/album-production test   # stage transitions, versioning, revisions, approval, e-album access
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build    # /albums production panel
pnpm --filter @bcp/gallery-web build   # /ealbum/[token] page-flip viewer
```
