# @bcp/marketing

Pure logic for the AI Marketing Studio: the 13-content-type registry
(each with its own format guidance), the 5-language registry, and
prompt composition from every input the brief names (brand voice,
service, city, target audience, tone, offer, platform, language). No
AI-SDK or database access — `apps/api`'s `marketing-content.service.ts`
calls `@bcp/ai` and persists results.

## What's here

```
src/
  content-types.ts             MARKETING_CONTENT_TYPES — 13 types,
                              each with format guidance folded into
                              the generation prompt
  languages.ts                     MARKETING_LANGUAGES — English,
                              Tamil, Kannada, Telugu, Hindi
  prompt-building.ts                   buildGenerationPrompt() — composes
                              every named input plus brand voice
                              settings and saved approved examples
                              (few-shot) into one prompt
  validation.ts                           generateContentSchema,
                              brandVoiceSettingsSchema,
                              saveBrandExampleSchema, approveRequestSchema
  index.ts                                    barrel export
```

See [docs/ai-marketing-studio.md](../../docs/ai-marketing-studio.md)
for the full design — how saved brand examples are what actually makes
"studio brand voice" improve over time rather than stay a static
description.

## Testing

```bash
pnpm --filter @bcp/marketing test
pnpm --filter @bcp/marketing typecheck
pnpm --filter @bcp/marketing lint
```
