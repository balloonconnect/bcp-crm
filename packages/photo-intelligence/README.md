# @bcp/photo-intelligence

Pure logic for AI-assisted photo analysis: score mapping (blur/
sharpness/exposure/noise/quality), perceptual-hash comparison for
duplicate/near-duplicate detection, group-photo threshold logic,
suggested moment-tag vocabulary, and the approve/reject/undo review
state machine. No image-processing or AI-SDK dependencies — `sharp`
(pixel statistics, perceptual hashing) and the Claude vision call
(composition/scene/moments) both live in `apps/api`, the same
"pure logic only" boundary every other domain package in this codebase
holds.

## What's here

```
src/
  scoring.ts          computeSharpnessScore(), deriveIsBlurry(),
                     computeNoiseScore(), evaluateExposure(),
                     computeQualityScore() — the weighted composite
  phash.ts               computeHammingDistance(), classifyDuplicate(),
                     similarityScoreFromDistance() — pure comparison
                     over hash strings computed server-side
  group-photo.ts             isGroupPhoto() — a plain face-count threshold
  moments.ts                    SUGGESTED_MOMENT_TAGS — seed vocabulary,
                     not a fixed enum
  review.ts                       resolveReviewTransition(), resolveUndo() —
                     approve/reject always available regardless of
                     current status; undo restores the log's own
                     previousStatus, never a guess
  validation.ts                     reviewActionSchema, bulkReviewSchema,
                     duplicateGroupReviewSchema, setBestShotSchema,
                     analysisFilterSchema
  index.ts                          barrel export
```

See [docs/ai-photo-intelligence.md](../../docs/ai-photo-intelligence.md)
for the full design — how "do not delete photos automatically" is held
structurally, and where each metric in the brief is actually computed.

## Testing

```bash
pnpm --filter @bcp/photo-intelligence test
pnpm --filter @bcp/photo-intelligence typecheck
pnpm --filter @bcp/photo-intelligence lint
```
