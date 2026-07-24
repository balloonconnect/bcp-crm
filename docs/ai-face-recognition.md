# AI face recognition

Guest-facing "find my photos" — a face scan or selfie upload matched
against one gallery's own indexed photos, using AWS Rekognition behind
a real provider abstraction. Built across `@bcp/face-recognition`
(provider interface + Rekognition implementation, confidence/quality
thresholds, consent enforcement, retention logic), `apps/api`'s
studio-side indexing and public search routes, `apps/studio-web`'s
settings panel, and `apps/gallery-web`'s guest flow.

## The AI provider abstraction

Nothing in the search flow calls the AWS SDK directly — every call
goes through `FaceRecognitionProvider`, an interface with
`createCollection`/`indexFacesInImage`/`detectFaces`/
`searchFacesByImage`/`deleteFace`. `RekognitionProvider` is the only
implementation today; swapping to a different vendor later means
writing one new class against this same interface, not touching the
search flow, the schema, or any calling code. `apps/api`'s
`face-provider.ts` resolves it from `AWS_REKOGNITION_*` environment
variables, returning `null` when unconfigured — the same
degrade-gracefully pattern every other optional external integration
in this codebase follows (SES, Razorpay/Cashfree, Web Push).

## Strict rule: no cross-studio or unauthorized cross-event search

Enforced structurally, not just by convention: `FaceCollection` is one
Rekognition collection **per gallery**, never per studio, never shared.
Every search call is handed exactly one collection ID — the one
belonging to the gallery the guest is actually looking at, resolved
from the gallery's own public token at the very top of the request.
There is no function anywhere in this codebase that accepts a
collection ID from outside the current gallery's own record, which
means there's no code path a bug could take to accidentally widen a
search beyond one gallery.

## The flow

1. **Guest opens gallery** — the existing gallery access gate
   (password/OTP/expiry from Prompt 26) already governs this.
2. **Privacy notice** — `POST /public/galleries/:token/face-search/consent`
   writes a `FaceConsentLog` row the moment a guest accepts, independent
   of whether they go on to actually search.
3. **Scan or selfie** — live camera capture (`getUserMedia` + a canvas
   frame grab) or a file upload, both funnel into the same flow.
4. **Detect** — `POST .../check-quality` runs Rekognition's
   `DetectFaces` *before* any search, surfacing multiple-face,
   low-light (via Rekognition's own `Quality.Brightness` score, not
   custom pixel analysis), or no-face-detected warnings so a guest can
   retake before a search (and its usage-metered cost) is attempted.
5. **Search within the permitted event** — `POST .../face-search`
   searches only that gallery's own `FaceCollection`.
6. **Matching photos displayed** — filtered through
   `@bcp/face-recognition`'s `filterByConfidence()` against the
   gallery's own configured threshold.
7. **Selfie deleted** — see below; by design, there's nothing to
   delete beyond the request's own lifetime.

## Selfies never remain permanently

The strongest possible reading of this rule: the captured image's
bytes are **never written to persistent storage at any point**.
`runFaceSearch()` processes them entirely in memory for the duration
of one request, then they're simply out of scope once the function
returns. `FaceSearchSession.selfieDeletedAt` is set the moment
processing finishes — proof this happened, not an assumption, and not
a separate cleanup step that could be skipped or fail.

## Confidence threshold, manual correction, multiple-face/low-light warnings

`Gallery.faceSearchConfidenceThreshold` (0–100, Rekognition's own
scale) is a per-gallery setting a studio controls; the Rekognition
provider itself is called with no threshold filtering
(`FaceMatchThreshold: 0`), so every candidate match is available for
`@bcp/face-recognition`'s own `filterByConfidence()` to apply — one
shared threshold rule, not the provider's own opinion of "confident
enough." `FaceSearchMatch.manuallyCorrected` covers manual correction:
a guest marking a suggested match as wrong deletes that match row
without ever touching the underlying face index. Multiple-face and
low-light warnings are advisory — a guest can proceed anyway
(`proceedDespiteWarning`), which is recorded on the session for audit.

## Usage tracking, retention settings

Reuses Prompt 6's existing plan-limit infrastructure directly — the
platform already had a `maxAiFaceSearchesPerMonth` dimension defined
before this phase, so no new usage-tracking system was built.
`Gallery.faceSearchRetentionDays` governs how long a `FaceSearchSession`
*record* (never the selfie, which is never persisted at all) is kept
before a studio would purge it — `@bcp/face-recognition`'s
`isEligibleForPurge()` is the pure logic; an actual scheduled purge job
is a natural next step once the platform has a job scheduler, the same
honest gap noted for other retention-style features elsewhere in this
codebase.

## Privacy logs, consent

`FaceConsentLog` is deliberately append-only and exempt from the
retention purge that clears old search sessions — a consent record is
itself the compliance evidence a studio needs to retain regardless of
how long the session it belongs to is kept. `apps/studio-web`'s face
search panel gives a studio a direct view of every consent recorded for
a gallery.

## Testing

```bash
pnpm --filter @bcp/face-recognition test   # confidence, quality warnings, consent, retention, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /galleries face-search settings panel
pnpm --filter @bcp/gallery-web build  # /g/[token] guest-facing flow
```
