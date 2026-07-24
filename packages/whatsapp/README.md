# @bcp/whatsapp

WhatsApp Business Cloud API client plus the pure logic for template
preview, retry backoff, opt-in/opt-out gating, and the 14-function
registry the brief names. Like `@bcp/invoicing` and `@bcp/finance`, the
logic files have no database access — `apps/api`'s
`whatsapp-sender.service.ts` is the one place config, consent, plan
limits, and message logging all come together.

## What's here

```
src/
  client.ts              WhatsAppClient — sendText/sendTemplate/
                        sendImage/sendDocument, one thin wrapper
                        over Meta's /messages endpoint
  template-preview.ts       previewTemplate(), countTemplateVariables()
                        — {{1}}, {{2}}, ... positional substitution,
                        Meta's own template syntax
  retry.ts                    canRetry(), computeRetryDelayMinutes()
                        — capped at 3 attempts, exponential backoff
  consent.ts                    canSendTo() — an explicit opt-out
                        blocks sending; "never asked" does not
  functions.ts                    WHATSAPP_FUNCTIONS — the 14 message
                        types named in the brief, and whether each
                        needs an approved template
  validation.ts                    whatsappConfigInputSchema,
                        templateInputSchema, sendTextInputSchema, etc.
  index.ts                          barrel export
```

See [docs/whatsapp-integration.md](../../docs/whatsapp-integration.md)
for the full design — how the central send path in `apps/api` composes
config resolution, opt-out/plan-limit checks, and message logging, and
how delivery status only ever advances forward from the webhook.

## Testing

```bash
pnpm --filter @bcp/whatsapp test
pnpm --filter @bcp/whatsapp typecheck
pnpm --filter @bcp/whatsapp lint
```
