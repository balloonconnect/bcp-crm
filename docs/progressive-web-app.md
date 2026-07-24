# Progressive Web App

`apps/studio-web` and `apps/client-portal` are both installable PWAs —
manifest, app icons, splash screens, standalone display mode, a real
install prompt, offline fallback, a cached app shell, push
notifications, background sync where the browser supports it, update
notifications, and — for Studio Console specifically — offline draft
support for a deliberately narrow set of safe operations.

## Discovered, not built from scratch

Most of Studio Console's PWA infrastructure already existed before
this pass touched it: `manifest.json`, real icons, a thorough
hand-written `sw.js` (app-shell caching, network-first navigation with
offline fallback, push receiving, background sync framed honestly as
"where supported," the update-notification handshake), a `PwaProvider`
wiring up the genuine `beforeinstallprompt` event, and a complete
IndexedDB-based offline cache/queue (`offline-db.ts`, `offline-actions.ts`,
`sync-queue.ts`) already implementing the brief's central constraint —
"do not claim offline support for operations requiring server
authorization" — via a hand-picked, documented list of safe,
additive/idempotent actions. That work held up under review; this pass
built the pieces still missing around it.

## What was actually missing, and what this pass added

- **The infrastructure existed but was never wired into the app.**
  Neither app's root layout linked its manifest, set PWA meta tags, or
  mounted its `PwaProvider` — real components sitting unused. Both are
  now wired in, plus Apple's `apple-touch-startup-image` splash-screen
  tags (two representative device sizes rather than the full ~30-
  combination matrix — a deliberate, stated scope choice, not an
  oversight).
- **Two of the three offline-queued actions pointed at endpoints that
  didn't exist** (`/equipment-checklists/:id/items/:itemId/complete`,
  `/leads/drafts`). Checked against the real API rather than assumed:
  `/equipment-checkouts/:id/checkin` already existed and does the same
  job (checking equipment back in is "completing a checklist item" in
  the sense the brief means); a lead draft is just an ordinary
  `POST /leads` once it syncs, needing no special server-side draft
  state at all.
- **"Add notes" had nothing to queue against.** Added a new, deliberately
  minimal `Note` model — polymorphic (any entity type/ID), append-only,
  so a note replayed twice by an imperfect offline sync just makes a
  harmless duplicate row rather than corrupting anything — plus its
  service and routes.
- **Push notifications were honestly stubbed, not fake.** Subscription
  storage and every route around it already existed; only the actual
  VAPID-signed send was a documented placeholder. Added the `web-push`
  package, VAPID environment configuration, and real delivery — with
  stale-subscription cleanup on a 404/410 response — then wired it into
  `notifyUser()` so the existing `browser_push`/`pwa_push` preference
  channels now genuinely dispatch (guarded against double-sending,
  since both channels read from the same stored subscriptions).
- **Client Portal had a manifest and icons but no service worker at
  all.** Built one — deliberately lighter than Studio Console's, since
  none of the brief's offline-supported operations are client-facing
  concerns; what a client's install genuinely benefits from is the
  same cached shell, offline fallback, and push receiving every PWA
  needs, without an offline write queue it has no real use for.

## Offline-supported operations, and why the list stops where it does

Viewing cached events, client contacts, shot lists, and equipment
checklists; adding notes; completing checklist items; saving lead
drafts; queuing those three write types. Every other action — creating
a quotation, recording a payment, sending a WhatsApp message, approving
an album — disables itself while offline instead of pretending to
queue something only the server can actually authorize. That
distinction is enforced by `OFFLINE_QUEUEABLE_ACTIONS` being the one
list every offline write is checked against, not a convention scattered
across individual pages.

## Testing

```bash
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build     # manifest, splash screens, PwaProvider, offline queue
pnpm --filter @bcp/client-portal build  # manifest, splash screens, lighter PwaProvider, sw.js
```
