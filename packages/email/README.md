# @bcp/email

Transactional email: an SMTP client (nodemailer), named-variable
template rendering, retry/bounce classification, unsubscribe checking,
and the 4-provider registry the brief names. Like `@bcp/whatsapp`, the
logic files have no database access — `apps/api`'s
`email-sender.service.ts` is the one place config, consent, plan
limits, branding, and message logging all come together.

**Frontend note**: `client.ts` depends on `nodemailer`, which pulls in
Node-only built-ins (`fs`, `net`, `dns`) that break a browser bundle.
Client-side code (e.g. `apps/studio-web`) should import browser-safe
pieces from their specific submodule path
(`@bcp/email/src/providers`, not the `@bcp/email` barrel) rather than
the full package, the same way `apps/studio-web/src/components/email/config-tab.tsx`
does.

## What's here

```
src/
  client.ts               EmailClient — SMTP send with attachments,
                         nodemailer-based (Node-only)
  template.ts                renderEmailTemplate(),
                         extractTemplateVariables(),
                         applyStudioBranding() — {{variableName}}
                         named placeholders, distinct from
                         WhatsApp's {{1}} numbered convention
  retry-bounce.ts             canRetry(), computeRetryDelayMinutes(),
                         classifyBounce() — bounced messages are
                         never retryable
  unsubscribe.ts                canSendTo() — allowed until an
                         explicit unsubscribe
  providers.ts                    EMAIL_PROVIDERS — platform_smtp/
                         studio_smtp/ses/resend
  validation.ts                     emailConfigInputSchema,
                         emailTemplateInputSchema, sendEmailInputSchema, etc.
  index.ts                          barrel export
```

See [docs/email-and-notifications.md](../../docs/email-and-notifications.md)
for the full design.

## Testing

```bash
pnpm --filter @bcp/email test
pnpm --filter @bcp/email typecheck
pnpm --filter @bcp/email lint
```
