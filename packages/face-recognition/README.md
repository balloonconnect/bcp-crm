# @bcp/face-recognition

AI face recognition: the AI provider abstraction the brief asks for
(`FaceRecognitionProvider`, with `RekognitionProvider` as the AWS
implementation), confidence-threshold filtering, capture-quality
warnings (multiple-face, low-light — via the provider's own quality
scoring), consent enforcement, and retention/purge logic. Unlike most
packages in this codebase, this one *does* touch a real external
SDK (`@aws-sdk/client-rekognition`) — it's the provider implementation
itself, not just types — so `apps/api` is the only place that should
import it, never a browser bundle (`RekognitionProvider` pulls in
Node-only AWS SDK internals the same way `@bcp/storage`'s `StorageClient`
does).

## What's here

```
src/
  provider.ts            FaceRecognitionProvider — the abstraction
                        interface every face-search call goes through
  rekognition-provider.ts    RekognitionProvider — the only
                        implementation today; swapping vendors means
                        writing one new class against the same interface
  confidence.ts             filterByConfidence() — one shared threshold
                        rule, not each provider's own opinion
  quality.ts                  evaluateCaptureQuality() — multiple-face/
                        low-light/no-face warnings, from Rekognition's
                        own Quality.Brightness score
  consent.ts                    assertConsented() — throws if a search
                        is attempted without a recorded consent
  retention.ts                    isEligibleForPurge() — for
                        FaceSearchSession records; selfies are never
                        persisted at all, so there's nothing to purge there
  validation.ts                     consentInputSchema, startFaceSearchSchema,
                        manualCorrectionSchema, gallerySettingsInputSchema
  index.ts                          barrel export
```

See [docs/ai-face-recognition.md](../../docs/ai-face-recognition.md)
for the full design — how "no cross-studio search" is enforced
structurally (one collection per gallery, never shared), and why
selfies are processed in memory and never written to storage at all.

## Testing

```bash
pnpm --filter @bcp/face-recognition test
pnpm --filter @bcp/face-recognition typecheck
pnpm --filter @bcp/face-recognition lint
```
