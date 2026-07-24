# AI culling and album suggestions

The layer above Prompt 29's photo intelligence: instead of scoring
individual photos, this composes those signals (quality score,
technical issues, duplicate groups, face detection) into higher-level
curation — which photos are worth delivering at all (culling), and
which of those belong in a specific album, in what order, with what
cover (album suggestions). Built across `@bcp/culling` (priority
weighting, presets, the recommendation and sequencing logic — all
pure, no AI-SDK or image-processing dependencies), `apps/api`'s
`culling-sessions.service.ts`/`album-suggestions.service.ts`, and
`apps/studio-web`'s review panels.

## Composes existing signals, never re-detects them

`startCullingSession()` requires Prompt 29's `PhotoAnalysis` and
duplicate-group detection to have already run for the photos it's
culling — it reads `qualityScore`, `isBlurry`/`closedEyeDetected`/
`exposureAssessment`, `momentTags`, and `DuplicateGroupMember`
membership, and turns them into a keep/drop/review verdict. A photo
with no analysis yet is simply skipped, never defaulted to any
verdict.

## The four priorities, and the 7 presets

`PriorityWeights` — `technicalQuality`, `emotionalMoments`,
`peopleBalance`, `poseVariety` — are what every preset actually
configures differently. A wedding leans hard on emotional moments and
people balance (many named guests, many rituals to represent); a
corporate gallery leans on technical quality and pose variety
(headshots need to look clean and non-repetitive far more than they
need "emotional protection"); a school gallery leans heavily on people
balance (every student represented) over any single dramatic moment.
Weights always sum to 1 (`normalizeWeights()`) so a studio's own manual
adjustment (`mergeWeights()`) never silently changes what "100%" means
for the priorities they didn't touch.

## Protect emotional moments — a real safeguard, not a suggestion with no teeth

`resolveCullingRecommendation()` applies two overrides on top of the
raw quality-based score, in a fixed order: an emotional-moment flag can
only ever pull a recommendation *up* (never down), rescuing a
technically soft but significant photo from exclusion; a duplicate/
repeated-pose penalty is applied *after* that protection and can never
push an emotionally significant photo to a hard exclude — at most it
floors the verdict at `review`, so a studio's own eyes make that call.
Confidence is genuinely calibrated to how far the final score sits from
the include/exclude thresholds, not a flat number.

## Identify important people

When a studio hasn't manually flagged anyone (`importantFaceIds`),
`rankImportantFaces()` falls back to frequency: the people who appear
in the most photos across an event gallery are, by construction, almost
always its actual subjects. Manual flagging always takes precedence
when provided.

## Album suggestions: sequence, cover, balance

`suggestAlbumSequence()` orders chronologically — the honest default
for event photography, where the natural narrative arc *is* the order
things happened. `selectCoverPhoto()` strongly prefers a photo
featuring an important person over an equally sharp but peripheral
detail shot. `balanceMomentCategories()` is "Balance people and
rituals": rather than simply taking the top-N photos by quality (which
could fill an album with 40 ceremony shots and zero reception candids),
it allocates the target count proportionally across the categories
actually present, filling each with its own highest-quality photos —
never padding a thin category past what it actually has.

## Manual adjustment, and never auto-deleting

Every AI verdict — a culling recommendation, an album photo's
inclusion, the cover pick, the sequence — is reviewable
(`approved`/`rejected`) or directly overridable (`setAlbumCover()`,
`reorderAlbumPhoto()`) by a studio, the same two-layer "AI suggests,
studio confirms" shape established in Prompt 29. **Original photos are
never deleted automatically** — enforced structurally: no function
anywhere in this entire pipeline, from culling recommendation through
album photo review, ever touches `GalleryPhoto` itself.

## Testing

```bash
pnpm --filter @bcp/culling test   # weights, presets, recommendation logic, important-people ranking, sequencing
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /galleries culling + album-suggestion panels
```
