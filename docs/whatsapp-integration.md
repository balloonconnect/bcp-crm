# WhatsApp integration

Full per-studio WhatsApp Business Cloud API integration — built across
`@bcp/whatsapp` (client, template preview, retry backoff, opt-in/opt-out
gating, the 14-function registry, validation) and `apps/api`/
`apps/studio-web`'s `/whatsapp` page. Replaces the env-var-based, single
global sender that quotation and invoice distribution (Prompts 16, 23)
used before this phase.

## Studio configuration

`WhatsAppConfig` is one row per studio — Meta Business ID, WABA ID,
Phone Number ID, access token, webhook verify token, and a default
sender label. Credentials are stored as plain fields, the same honest
limitation every other external-integration credential in this schema
has (no secrets-manager infrastructure exists to plug into); a real
deployment would put these behind one.

`apps/api`'s `whatsapp-sender.service.ts` resolves a studio's own
config first, falling back to the `WHATSAPP_*` environment variables
only when a studio hasn't configured its own — preserving the
degrade-gracefully behavior quotation/invoice distribution already had,
since a local/dev environment realistically has neither.

## The central send path

Every one of the 14 "functions" named in the brief — quotation,
invoice, receipt, gallery, payment reminder, booking confirmation,
event reminder, selection reminder, delivery notification, review
request, plus plain text/template/image/PDF — routes through one
function, `sendWhatsAppMessage()`. It:

1. Checks the recipient hasn't opted out (`@bcp/whatsapp`'s
   `canSendTo()` — an explicit opt-out blocks sending; "never asked"
   does not, since WhatsApp Business messaging is normally permitted
   for an existing business relationship without requiring a formal
   opt-in first).
2. Checks the studio's plan limit
   (`maxWhatsappMessagesPerMonth` — reuses Prompt 6's plan-limit
   infrastructure directly, the same `assertWithinPlanLimit()`/
   `recordUsage()` every other metered dimension in the platform
   already goes through).
3. Creates a `WhatsAppMessage` row *before* attempting the send, so a
   failed send is still tracked, never silently lost.
4. Attempts the send, then updates the row to `sent` or `failed`.

`invoice-distribution.service.ts` and `quotation-distribution.service.ts`
were refactored in this phase to call through this one path instead of
each maintaining its own duplicated client — consolidating tracking,
config resolution, and consent/limit checks in one place rather than
three.

## Tracking: queued → sent → delivered → read, or failed

`WhatsAppMessage.status` only ever advances *forward*, and only ever
from `whatsapp-webhook.service.ts` for delivered/read/failed —
`apps/api`'s webhook handler matches Meta's status callbacks back to a
studio by `phone_number_id`, then to a specific message by
`providerMessageId` (Meta's wamid). One platform-wide webhook endpoint
receives every studio's updates, since Meta doesn't address webhooks
per-tenant.

## Retry

`@bcp/whatsapp`'s `canRetry()` only allows retrying a genuinely
`failed` message, capped at 3 attempts — a message still `queued`
hasn't failed yet, and unlimited retries would let one bad number
silently burn through a studio's monthly quota. `computeRetryDelayMinutes()`
implements simple exponential backoff (1, 2, 4 minutes).

## Usage tracking & plan enforcement

Both reuse Prompt 6's existing `UsageRecord`/plan-limits machinery
directly — no new tracking infrastructure was built for this phase,
since the platform already anticipated a `maxWhatsappMessagesPerMonth`
dimension.

## Opt-in / opt-out

`WhatsAppOptStatus` is keyed by phone number, not by `Client` or
`Lead`, since consent is a property of the number a message would go
to — independent of which domain record happens to reference it at the
time.

## Template variable preview

`@bcp/whatsapp`'s `previewTemplate()` substitutes `{{1}}`, `{{2}}`, ...
placeholders with real values — the exact same positional syntax Meta's
own templates use, so there's no translation layer between what the
in-app preview shows and what actually gets sent.

## Testing

```bash
pnpm --filter @bcp/whatsapp test   # template preview, retry, consent, functions registry, validation
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build  # /whatsapp
```
