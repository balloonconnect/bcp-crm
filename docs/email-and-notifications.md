# Email and notifications

Centralized communication infrastructure — full per-studio email
provider configuration and delivery tracking, plus a channel-agnostic
notification system spanning in-app, email, WhatsApp, and Web Push.
Built across `@bcp/email` (client, template rendering, retry/bounce
classification, unsubscribe, provider registry), `@bcp/notifications`
(channel routing, preference defaults), and `apps/api`/
`apps/studio-web`'s `/email` and `/notifications` pages.

## Four email providers, one config shape

`EmailConfig` holds fields for all four providers named in the brief —
`platform_smtp` (the platform's own shared sender, needing no studio
setup at all), `studio_smtp`, Amazon SES, and Resend — with only the
fields relevant to the selected `provider` expected to be populated.
Resend is fully wired via its simple REST API (no SDK needed, the same
"raw fetch over a documented endpoint" approach `@bcp/whatsapp`'s
client already uses for Meta's API). Amazon SES is an honest
credentials-shaped limitation, not a missing feature — it needs the AWS
SDK, which isn't bundled in this environment, the same limitation this
codebase already accepts for Razorpay/Cashfree (Prompt 23) and Web
Push VAPID keys (below).

## Templates: named variables, not positional

`EmailTemplate.bodyHtml` uses `{{variableName}}` placeholders —
deliberately different from `@bcp/whatsapp`'s `{{1}}` numbered
convention, because each is matching a different external norm: nearly
every HTML email tool uses named variables, where Meta's WhatsApp
templates specifically use numbered parameters.
`@bcp/email`'s `renderEmailTemplate()` substitutes them the same way
`previewTemplate()` does for WhatsApp — same idea, matched to each
channel's own syntax. An unmatched variable is left as literal
`{{name}}` text rather than going blank, so a missing variable is
visible in a preview, not silently swallowed.

## Studio branding on every email

`applyStudioBranding()` wraps every rendered email body in the sending
studio's logo, name, and brand color — pulled from the same
`StudioBrand` record the client portal and public quotation/gallery
pages already use — so a transactional email looks like it came from
the studio, not a generic platform notification.

## Delivery tracking: queued → sent → delivered → bounced/failed

`EmailMessage` is the full outbound log — every email this platform
sends creates one row, the same "one log for everything, linked by a
lightweight polymorphic contextType/contextId pair" convention
`WhatsAppMessage` established. `bounced` is deliberately its own
status, distinct from `failed`: a bounce is the provider telling the
platform an address is genuinely undeliverable (and a strong signal to
stop retrying it), where `failed` covers transient errors. Retry
(`canRetry()`, capped at 3 attempts, exponential backoff) explicitly
never retries a bounced message — retrying a hard bounce only damages
the studio's own sender reputation with no chance of success.

## Unsubscribe

`EmailUnsubscribe` is per-address, per-studio — email defaults to
"allowed to send" until an explicit unsubscribe (the industry-standard
default), simpler than `WhatsAppOptStatus`'s three-state model since
WhatsApp's stricter norms include a genuine "never asked" middle state
that email doesn't need. A public, unauthenticated
`GET /public/email/unsubscribe` endpoint exists so a recipient clicking
"unsubscribe" in an email footer never needs to log in first.

## Five notification channels, per-user preferences

`NotificationPreference` is one row per `StudioUser` — a plain boolean
per channel (in-app, email, WhatsApp, browser push, PWA push), matching
`DashboardPreference`'s "one preferences row per user" shape but with
fixed columns instead of a JSON blob, since there are only 5 channels
to toggle rather than an open-ended set. In-app is always on regardless
of preference — suppressing a user's own notification center would
hide the notification everywhere with no way to ever see it.
`@bcp/notifications`' `resolveEnabledChannels()` is the one function
that turns a user's stored (or default) preferences into an actual
dispatch decision.

## The dispatch path

`notifyUser()` always creates the in-app `Notification` row, then
dispatches on whichever additional channels the user has enabled via
the exact same central `sendEmail()`/`sendWhatsAppMessage()` paths
every other feature in the platform already routes through — no
separate "notification-only" send logic to keep in sync with the real
one. A failed email/WhatsApp dispatch here is tracked by that channel's
own message log and never blocks the in-app notification from existing.

## Web Push (browser and PWA)

`PushSubscription` storage and lookup — the part genuinely testable
without external credentials — is fully implemented, one row per
device (a user with the app open on phone and laptop has two
subscriptions, which is correct: push targets a specific browser
subscription, not a person). Actually delivering a push payload needs
VAPID keys this environment doesn't have configured; wiring in the
`web-push` library once they exist is a small addition on top of the
storage layer already built, not a redesign.

## Testing

```bash
pnpm --filter @bcp/email test          # template rendering, retry/bounce, unsubscribe, providers
pnpm --filter @bcp/notifications test  # channel defaults, dispatch resolution
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build    # /email, /notifications
```
