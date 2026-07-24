# AI Marketing Studio

AI-generated marketing content across 13 content types and 5
languages, composed from the exact inputs the brief names — studio
brand voice, service, city, target audience, language, tone, offer,
platform — with a mechanism for a studio's approved output to actually
improve future generations. Built across `@bcp/marketing` (content-
type registry, language registry, prompt composition — all pure) and
`apps/api`'s `marketing-content.service.ts`.

## Content types and languages, as registries not hardcoded logic

`@bcp/marketing`'s `MARKETING_CONTENT_TYPES` covers all 13 named in
the brief, each with its own format guidance folded into the
generation prompt — a caption and a blog outline need entirely
different instructions even though both go through the same pipeline.
`MARKETING_LANGUAGES` covers English, Tamil, Kannada, Telugu, and
Hindi; the generation prompt instructs the model to write entirely in
the target language, not a transliteration.

## Studio brand voice is two things, working together

`MarketingBrandVoiceSettings` is a studio's own explicit voice profile
(a tone description, key phrases to reuse, phrases to avoid) —
deliberately a separate model from `StudioBrand` (Prompt 9's visual
branding: logo, colors), since tone of voice and visual identity are
configured independently. But a static tone description only goes so
far, which is why "studio brand voice" is really two inputs combined:
the settings *and* up to a handful of the studio's own most recent
`BrandVoiceExample`s for that exact content type, included in the
prompt as few-shot material. This is what actually makes brand voice
calibrate over time rather than stay a fixed description forever.

## Allow users to save approved brand examples

Saving directly from a generation result (`BrandVoiceExample.sourceRequestId`)
marks that request `savedAsBrandExample` and links the two records;
saving a hand-written example a studio pasted in from outside this
tool skips the link entirely — both are equally valid few-shot
material going forward. Every request is persisted with its own inputs
snapshotted independently of whatever the brand voice settings say by
the time anyone looks back — a later brand voice change never
retroactively reinterprets what an old request actually produced.

## Testing

```bash
pnpm --filter @bcp/marketing test   # content types, languages, prompt composition, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /marketing generation + brand voice + saved examples
```
