# AI photo intelligence

An AI-assisted analysis pipeline that scores and flags every delivered
gallery photo — blur, exposure, noise, faces, composition, duplicates —
so a studio can quickly triage a large shoot without ever having a
photo removed on its behalf. Built across `@bcp/photo-intelligence`
(scoring math, perceptual-hash comparison, review/undo logic,
validation — all pure, no image-processing or AI-SDK dependencies),
`apps/api`'s analysis pipeline (real pixel statistics via `sharp`,
face attributes via the Prompt 28 `FaceRecognitionProvider`
abstraction, composition/scene via Claude vision), and
`apps/studio-web`'s review panel.

## Every metric the brief names, computed for real

- **Blur / sharpness** — Laplacian variance over a greyscale
  convolution (`photo-analysis-vision.ts`), a standard, real
  computer-vision measure — not a stub.
- **Exposure** — mean luminance distance from mid-gray, classified
  under/good/over.
- **Noise** — a documented, honest approximation (flat-region standard
  deviation as a fast proxy for sensor noise, since a rigorous measure
  needs a denoised reference this pipeline doesn't have) — the same
  kind of caveat professional blur/noise heuristics carry too.
- **Duplicate / near-duplicate** — a 64-bit difference-hash (dHash)
  compared pairwise within a gallery by Hamming distance; exact vs.
  near is just where that distance falls, one shared `classifyDuplicate()`
  function rather than two separate detectors.
- **Face count, closed-eye, smile** — via `FaceRecognitionProvider`'s
  `detectFaceAttributes()`, a method added to that interface
  specifically for this phase (distinct from Prompt 28's `detectFaces()`,
  which is scoped to a guest's live search capture and never returns
  expression detail a search doesn't need).
- **Group-photo detection** — a plain threshold on the same face count,
  no separate classifier needed.
- **Subject prominence, composition score, scene classification, event
  moment tagging** — the one part of the pipeline needing actual visual
  understanding rather than pixel math, via Claude vision
  (`photo-analysis-semantic.ts`). A malformed AI response still
  produces a real (if low-confidence, clearly labeled) fallback rather
  than silently skipping a photo the pipeline is supposed to always
  cover.
- **Quality score** — one weighted composite (technical measures and
  the semantic/composition measures weighted equally), the single
  number a "best shots" view sorts by.
- **Best-shot suggestion** — scoped concretely to within one
  duplicate/near-duplicate cluster (picking the keeper among near-
  identical frames); a gallery-wide "best of the event" view is just
  `qualityScore` sorted descending, no separate model needed.

## Every AI result: confidence, explanation, approve, reject, bulk review, undo

`PhotoAnalysis.confidence`/`explanation` are always populated — the
semantic stage's fallback path guarantees this even when the AI call
itself fails. Approve/reject are always available regardless of
current status (a studio can reconsider a rejection), logged to
`PhotoAnalysisReviewLog` rather than overwriting the status blindly.
Undo restores whatever `previousStatus` the most recent log entry
actually recorded — never a guessed default — and undoing an
already-undone entry is rejected outright rather than silently
producing a confusing double-undo. Bulk review shares one `batchId`
across every row a single bulk action touches, so bulk-undo restores
each photo to its own prior state as one operation, not the studio
manually undoing N separate ones.

## Do not delete photos automatically

Enforced structurally: nowhere in the review flow — approve, reject,
undo, bulk, or duplicate-group review — does any code path touch
`GalleryPhoto` itself. A studio acting on a confirmed "blurry" flag or
a confirmed duplicate is a deliberate, separate step through the
existing photo-management actions from Prompt 26 (hide/remove), never
an automatic consequence of the AI's own verdict.

## Testing

```bash
pnpm --filter @bcp/photo-intelligence test   # scoring, phash, review/undo, group-photo, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /galleries analysis + duplicate-group review panel
```
