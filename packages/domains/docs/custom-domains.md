# Custom Domain Management

How a studio points their own domain(s) at BCP Studio OS, and how the
platform safely serves traffic on them. Implementation lives in
`@bcp/domains` (pure DNS/verification/security logic),
`@bcp/database`'s expanded `StudioDomain` model, and
`apps/api/src/{services/domains.service.ts,plugins/hostname-middleware.ts,routes/domains.routes.ts}`.

## Domains for five surfaces

A studio can point different domains at different parts of the product —
`StudioDomain.purpose` records which:

| Purpose | Example | What it serves |
|---|---|---|
| `studio_crm` | `app.mystudio.com` | The studio's own CRM login |
| `client_portal` | `portal.mystudio.com` | Where the studio's clients track bookings |
| `gallery` | `gallery.mystudio.com` | Public/private photo gallery delivery |
| `enquiry_form` | `book.mystudio.com` | Public lead-capture form |
| `root_website` | `mystudio.com` | The white-label marketing/root site |

Each purpose can have several domains (apex + `www`, staging, …) but at
most one `isPrimary` **per purpose** — a studio can have a primary CRM
domain and a separate primary gallery domain simultaneously. This is
enforced by a partial unique index on `(studio_id, purpose) WHERE
is_primary = true` (migration `20260710000400_custom_domains`).

## Domain lifecycle

```
 pending ──► verifying ──► verified ──► active
    │            │                        │
    │            └──► failed (exhausted retries)
    │
    └──────────────────────────────────────────► suspended (removed)
```

- **pending** — just added, verification not yet attempted.
- **verifying** — at least one verification attempt made and failed;
  another retry is scheduled (`nextRetryAt`, see "Verification retries").
- **verified** — DNS ownership confirmed. SSL provisioning begins
  automatically (`nextSslStatusAfterVerification()` moves `sslStatus`
  from `none` to `pending`).
- **active** — verified **and** SSL issued (`canActivate()` requires
  both) — the domain now actually serves traffic. Activation is a
  separate, explicit step from verification so a studio can review DNS
  status before flipping a domain live.
- **failed** — verification retries exhausted (20 attempts, see
  `MAX_VERIFICATION_ATTEMPTS`) without success. A studio can fix their DNS
  and manually retry, which resets the attempt counter.
- **suspended** — used for removed domains (see "Domain removal") — the
  row is soft-deleted (`deletedAt` set) and its status set to `suspended`
  so the domain can no longer resolve even if the DNS records are still
  live at the registrar.

## Adding a domain & DNS instructions

`POST /domains` validates the hostname (via `@bcp/domains`'
`validateHostHeader` — the same paranoid validation the hostname
middleware itself runs, see below), checks it isn't already registered to
another studio, and issues a random verification token. It also picks a
default verification method: **TXT for apex domains, CNAME for
subdomains** — apex domains can't carry a CNAME record at all (RFC 1034 §
3.6.2 — a CNAME can't coexist with other record types like MX/SOA at the
zone root), so TXT is the only option there; subdomains can use either,
and CNAME is offered by default since it doubles as a lightweight
traffic-routing hint.

`generateDnsInstructions()` then produces the exact records to publish:

- **Always** a TXT record at `_bcp-verify.<domain>` with the verification
  token — proves ownership *before* any traffic-routing record is
  required, avoiding a chicken-and-egg setup order.
- **Routing records**: a CNAME to `DOMAIN_CNAME_TARGET` for subdomains, or
  one A record per IP in `DOMAIN_APEX_IPS` for apex domains (with a note
  suggesting an ALIAS/ANAME record instead, where the provider supports
  one — see the Cloudflare and Route 53 setup guides).

### Apex domain detection

`isApexDomain()` treats any two-label domain (`example.com`) as apex and
anything with more labels (`portal.example.com`) as not. This is a
deliberate simplification — it doesn't consult the [Public Suffix
List](https://publicsuffix.org/), so a domain like `example.co.uk` is
(incorrectly) treated as non-apex. Fixing this properly means shipping
and maintaining a PSL dataset; until a studio actually hits this edge
case in practice, the simpler heuristic covers the overwhelming majority
of real custom domains (`.com`, `.studio`, `.photography`, `.in`, etc).

## TXT / CNAME verification & retries

`apps/api`'s `verifyDomain()` performs a real DNS lookup (Node's
`dns.promises.resolveTxt`/`resolveCname`) and hands the result to
`@bcp/domains`' `evaluateVerification()` — a pure function, so the
match/no-match logic is fully unit-tested without a network call (see
`packages/domains/src/__tests__/verification.test.ts`). A failed DNS
lookup (NXDOMAIN, timeout) is distinguished from "looked up fine, but no
matching record" (`dns_lookup_failed` vs. `no_matching_record`) since a
studio troubleshooting their setup needs to know which one they're
looking at.

**Retries** back off progressively rather than polling on a fixed
interval — DNS propagation timing varies wildly (minutes to, rarely, 48
hours): 1m → 5m → 15m → 30m → 1h → 3h → 6h → 12h, then repeating at 12h,
up to `MAX_VERIFICATION_ATTEMPTS` (20, roughly a week's worth) before the
domain moves to `failed`. `evaluateRetry()` computes the schedule; a
worker job (`listDomainsDueForRetry()`) is expected to poll for domains
whose `nextRetryAt` has passed and re-attempt — not built as a running
job in this phase, but the query and the retry-decision logic it needs
are.

## SSL status

`sslStatus` moves from `none` → `pending` automatically the moment DNS
verification succeeds (provisioning is expected to be driven by whatever
TLS/certificate infrastructure sits in front of the app — e.g. Vercel's
automatic domain SSL, Cloudflare's edge certificates, or an ACME client
in front of Nginx — see the setup guides). `markSslIssued()` is the
integration point a certificate-manager webhook or job calls once a cert
is actually live, recording `sslIssuedAt`/`sslExpiresAt`.
`needsSslRenewal()` flags certificates within a 14-day window of expiry —
proactively, not at the deadline, so a DNS or CA hiccup during renewal
doesn't cause a live outage.

## Domain activation & primary domain

Activation (`POST /domains/:id/activate`) is a distinct, explicit step
from verification: `canActivate()` requires **both** `verified` (or
already `active`) status **and** `sslStatus === "issued"`. A studio can
verify a domain, see it's ready, and choose when to actually flip it live
— e.g. to time a domain cutover outside business hours.

`POST /domains/:id/set-primary` marks a domain primary for its purpose,
atomically unsetting any previous primary for that `(studio, purpose)`
pair in the same transaction as setting the new one, so there's never a
moment with zero or two primaries for a purpose.

## Domain removal

`DELETE /domains/:id` is a **soft** delete (`deletedAt` set, `status`
moved to `suspended`, `isPrimary` cleared) — consistent with the platform
convention documented in
`packages/database/docs/database-conventions.md` § "Soft deletion". The
domain immediately stops resolving (the hostname middleware only ever
matches `deletedAt: null` rows) while the row itself, and its full audit
history, remain queryable.

## Domain audit logs

Every domain lifecycle event (`domain.added`, `domain.verified`,
`domain.verification_retry_scheduled`, `domain.verification_failed`,
`domain.activated`, `domain.set_primary`, `domain.removed`) is written to
the shared `AuditLog` table with `resourceType = "StudioDomain"` —
reusing the platform's one audit mechanism rather than a dedicated
per-resource table, per
`packages/database/docs/database-conventions.md` § "Audit columns".
`GET /domains/audit-log` (optionally filtered to one `domainId`) surfaces
this history in the domain management UI.

## Secure hostname middleware

`apps/api/src/plugins/hostname-middleware.ts` is registered as an
`onRequest` hook — the very first thing that runs on every request,
before authentication, before routing, before anything else. Each of the
required steps maps to a concrete piece of the implementation:

1. **Validate the host.** `validateHostHeader()` (`@bcp/domains`) rejects
   malformed, oversized, or suspicious Host headers outright — see "Host
   validation & attack prevention" below.
2. **Resolve the studio.** Only `StudioDomain` rows with
   `status = "active"` and no `deletedAt` resolve — `pending`/
   `verifying`/`failed` domains 404 rather than confirming that *some*
   studio has registered that hostname, which would leak information to
   anyone probing hostnames.
3. **Verify domain ownership.** Implicit in step 2 — a domain only
   reaches `active` after DNS ownership verification (step above) and SSL
   issuance succeeded; there's no path to `active` that skips ownership
   proof.
4. **Reject suspended studios.** `checkStudioSuspension()`
   (`@bcp/domains`) blocks `suspended`/`cancelled` studios immediately,
   before branding or tenant context are even resolved.
5. **Apply subscription restrictions.** `checkSubscriptionRestriction()`
   blocks a studio whose plan doesn't include the `custom_domain` feature
   (resolved via the same platform → studio feature-flag precedence from
   the branding engine — see `packages/branding/docs/branding.md`) or
   whose subscription has hard-`expired`. A studio in its billing `grace`
   period is let through but flagged `degraded: true`, so the UI can show
   a billing-issue banner without taking a live client-facing gallery
   offline over a temporarily lapsed payment.
6. **Apply branding.** `getResolvedTheme()` (the branding engine's cached
   theme resolution, see `packages/branding/docs/branding.md`) runs for
   every matched request, and the resolved theme is attached to
   `request.hostnameContext.theme`.
7. **Apply tenant context.** `request.hostnameContext` (`{ studioId,
   domain, purpose, degraded, theme }`) is what public route handlers
   (gallery, portal, enquiry form) read directly — no session needed,
   since these are public surfaces. Authenticated CRM routes still run
   `tenant-context.ts`'s independent session-based resolution as well
   (see `docs/authentication.md`) — this is defense in depth, not a
   replacement: a request on a custom CRM domain gets *both* checks.

### Host validation & attack prevention

`validateHostHeader()` defends against the host-header-injection family
of attacks specifically:

- **Multiple Host headers** (array form) are rejected outright — an
  intermediary and the app disagreeing on which value is "the" Host is
  exactly the ambiguity these attacks exploit.
- **Userinfo-prefixed hosts** (`attacker.com@real-host.com`) are rejected
  — a classic trick against naive URL/host parsers.
- **Control characters and embedded whitespace** are rejected — including
  attempted header injection via `\r\n`.
- **IP literals are rejected by default** — a custom domain is always a
  real hostname; allowing raw IPs as Host values has no legitimate use
  here and only adds attack surface.
- **Length and label limits** (253 chars total, 63 per label, RFC 1035)
  and **character-set validation** (`a-z0-9.-` only, post-lowercasing)
  guard against malformed input causing downstream parsing surprises.
- Every check **fails closed**: any ambiguity or deviation from a strict,
  well-formed hostname is rejected rather than "best-effort" normalized
  and let through.

See `packages/domains/src/__tests__/host-validation.test.ts` for the
full behavioral spec, including exactly what each rejection reason
covers.

## Platform hostnames vs. custom domains

`isPlatformHostname()` (`apps/api/src/lib/is-platform-hostname.ts`) checks
whether the validated hostname is (or is a subdomain of) one of
`PLATFORM_HOSTNAMES` (an env var, e.g. `bcpstudio.os`) — these never go
through custom-domain resolution at all; normal app routing (subdomain-
or session-based tenant resolution) applies instead. Only requests that
*aren't* on a platform hostname reach the custom-domain lookup in step 2
above.
