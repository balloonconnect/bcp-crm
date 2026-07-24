# @bcp/culling

Pure logic for AI-assisted culling and album suggestions: priority
weighting (the four dimensions every preset configures differently),
the 7 named presets, the core keep/drop/review recommendation function,
importance-by-frequency ranking, and album sequencing/cover-selection/
category-balancing. No AI-SDK or image-processing dependencies — this
package *composes* signals `@bcp/photo-intelligence` and
`@bcp/face-recognition` already produced (quality scores, technical
issues, duplicate groups, face detections); it never re-detects
anything itself. `apps/api`'s `culling-sessions.service.ts` and
`album-suggestions.service.ts` are where those real signals get pulled
from the database and handed to these functions.

## What's here

```
src/
  weights.ts             PriorityWeights, normalizeWeights(),
                        mergeWeights() — always sums to 1, manual
                        overrides replace only the keys touched
  presets.ts                CULLING_PRESETS (wedding/engagement/baby/
                        maternity/birthday/corporate/school),
                        getPresetWeights()
  recommendation.ts             resolveCullingRecommendation() — the
                        core scoring function; emotional-moment
                        protection can only ever pull a verdict up,
                        duplicate/repeated-pose penalty only ever
                        pulls it down, applied in that fixed order
  important-people.ts               rankImportantFaces() — frequency-
                        based fallback for "identify important people"
                        when a studio hasn't manually flagged anyone
  sequencing.ts                        suggestAlbumSequence() (chronological),
                        selectCoverPhoto() (prefers an important
                        person), balanceMomentCategories() (proportional
                        allocation across categories, never over-fills
                        a thin one)
  validation.ts                           startCullingSessionSchema,
                        cullingReviewSchema, startAlbumSuggestionSchema,
                        albumPhotoReviewSchema, setAlbumCoverSchema
  index.ts                                barrel export
```

See [docs/ai-culling-and-albums.md](../../docs/ai-culling-and-albums.md)
for the full design — why this layer never re-detects what Prompt 29
already computed, and how "never delete photos automatically" is held
structurally throughout.

## Testing

```bash
pnpm --filter @bcp/culling test
pnpm --filter @bcp/culling typecheck
pnpm --filter @bcp/culling lint
```
