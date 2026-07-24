# @bcp/notifications

Channel-agnostic notification logic: the 5 channels named in the
brief, default preferences for a user who's never configured one, and
the one function that turns stored preferences into an actual dispatch
decision. No database access — `apps/api`'s `notifications.service.ts`
and `notification-preferences.service.ts` do the actual reading/writing
and call into `sendEmail()`/`sendWhatsAppMessage()` for the non-in-app
channels.

## What's here

```
src/
  channels.ts       NOTIFICATION_CHANNELS, DEFAULT_CHANNEL_PREFERENCES,
                   isChannelEnabled(), resolveEnabledChannels() —
                   in_app is always included regardless of preference
  validation.ts       notificationPreferenceInputSchema,
                   pushSubscriptionInputSchema, createNotificationInputSchema
  index.ts             barrel export
```

See [docs/email-and-notifications.md](../../docs/email-and-notifications.md)
for the full design — how `notifyUser()` composes this package's
routing decision with the real email/WhatsApp send paths.

## Testing

```bash
pnpm --filter @bcp/notifications test
pnpm --filter @bcp/notifications typecheck
pnpm --filter @bcp/notifications lint
```
