# Client portal

A white-label, OTP-authenticated client account portal — every action
named in the brief in one place: profile, bookings, events,
quotations (+ accept), contracts (+ sign), invoices (+ pay, + receipts),
galleries, photo selection, album review, print/delivery tracking, and
support requests. Built on `apps/client-portal`'s `/portal/[studioSlug]`,
with `apps/api`'s `client-portal-auth.service.ts` and
`client-portal.service.ts` as the backend.

## A genuinely new kind of session

Every other guest-adjacent flow in this codebase (gallery viewing,
album selection, e-album viewing) scopes a guest token to *one*
gallery or album. The client portal is different: `ClientPortalSession`
is scoped to the `Client` record itself, so one OTP login surfaces
everything that client has across the whole studio relationship —
every booking, quotation, invoice, gallery, and album tied to their
`clientId` — in one dashboard, not a separate link per item.

## Scoped by client, not just studio

This is the one place in the codebase where tenant isolation alone
isn't enough. Every function in `client-portal.service.ts` filters by
**both** `studioId` and `clientId` on every query — there's no
shortcut path that queries by `studioId` alone, since a portal session
must never surface a sibling client's data within the same studio.

## Login is OTP-only

The same "no password to manage" pattern every other guest-adjacent
flow in this codebase already uses, rather than asking a client to
invent and remember a password for a portal they might open twice a
year. A client is looked up by email within one studio — a person
who's a client of two studios in this platform has two entirely
separate portal accounts, correctly, since their relationship and data
with each studio are genuinely independent.

## A naming collision caught during development

While building this, schema validation caught that a new
`SupportRequest` model (this prompt's client-initiated ticket) would
have collided with an already-existing `SupportRequest` model from an
earlier prompt — an unrelated relationship, a *studio's own* ticket to
the *platform*. Renamed to `ClientSupportRequest`/
`ClientSupportRequestReply` and reused the existing
`SupportRequestStatus` enum directly (identical lifecycle, no reason to
duplicate it), rather than papering over two same-named-but-different
concepts.

## Sign contracts, make payment — matching existing mechanisms, not inventing new ones

"Sign contracts" uses a typed full name plus a timestamp
(`ClientContract.signedByName`) — the same lightweight signing
mechanism this codebase already leans on in place of a captured
signature image, consistent with OTP-instead-of-password everywhere
else a guest-adjacent actor needs to affirmatively act. "Make payment"
is an honest self-report flow, not a simulated success: this codebase
has no live payment gateway wired up (a documented gap since Prompt
23), so a client reporting a payment they made outside the portal
lands as a normal `ClientPayment` a studio then confirms — through the
exact same `recordPayment()` every other payment-recording path in the
platform already uses.

## Deep-links, not rebuilt flows

Photo selection, album review, and e-album viewing aren't
reimplemented inside the portal — `listAlbums()` surfaces each album's
own `publicToken`/`eAlbumToken` so the dashboard can link straight into
the existing Prompt 31/32 experiences. One flow, one implementation,
linked from two places.

## Simplified mobile dashboard, branding, custom domain

The dashboard leads with a compact summary (next event, quotations
awaiting review, invoices due, open support requests) and a sticky
bottom tab bar rather than a dense sidebar that assumes a wide screen —
mobile-first, not a desktop layout with mobile CSS bolted on. Branding
and custom-domain resolution both flow through the exact same
`/public/branding` lookup by studio slug every other public surface
(gallery, quotation, enquiry form) already uses — no separate branding
mechanism built for the portal specifically.

## Testing

```bash
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/client-portal build   # /portal/[studioSlug]
```
