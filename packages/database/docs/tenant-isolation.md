# Tenant Isolation

How BCP Studio OS keeps one studio's data from leaking into another's, at
every layer from the database schema up through the application code that
queries it.

## The two identity planes

Everything in `schema.prisma` sits in one of two planes that never mix:

- **Platform** — `PlatformUser`, `PlatformRole`, `PlatformPermission`,
  `PlatformUserRole`. This is BCP Studio OS's own staff, running
  platform-admin. There is no `studioId` anywhere in this plane because
  it isn't tenant data — a platform support engineer's account isn't
  "in" any studio.
- **Studio** — everything else. Every row is either directly owned by a
  studio (`studioId` on the row) or is itself the `Studio` row.

A platform employee having an account does **not** grant them access to
any studio's data. If a platform user needs to act on a studio's behalf
(e.g. impersonation for support), that must be an explicit, audited action
— see "Support impersonation" below — never implicit from being staff.

## `studioId` is on every studio-scoped row, directly

Every studio-scoped model carries `studioId` as a column on the row
itself, not just reachable by joining through a parent. Two consequences:

1. **Every tenant-scoped query can filter with a single `WHERE studio_id =
   $1`**, with a btree index behind it (`@@index([studioId])` on every
   such model) — no query needs a join purely to enforce isolation.
2. **Denormalization is intentional in places.** `Activation.studioId` is
   reachable via `Activation.licenseKey.studioId`, but it's stored
   directly anyway, specifically so isolation doesn't depend on a join
   being written correctly in every call site that touches activations.

## Where `studioId` is nullable, and why

Five models have a nullable `studioId`: `FeatureFlag`, `AuditLog`,
`LoginHistory`, `Session`, `JobRecord`. In every case, `null` means
"platform-wide," not "unscoped by mistake":

- `FeatureFlag` — `studioId = null` is the **global default** for a flag
  key; a row with a specific `studioId` **overrides** that default for one
  studio. See [database-conventions.md](./database-conventions.md) §
  "Plan limits & feature flags" for resolution order.
- `AuditLog`, `LoginHistory`, `Session`, `JobRecord` — most rows are
  studio-scoped (a studio user logs in, a studio's job runs), but a
  platform user's login, a platform admin's audit trail entry, or a
  platform-wide nightly job legitimately has no studio.

Application code must never treat a `null` `studioId` on these models as
"belongs to no one, so any studio can see it." The tenant-scoped client
(below) never returns null-`studioId` rows through a studio-scoped
connection at all — it would rather return nothing than accidentally leak
platform data into a tenant's view.

## Enforcement layers

Isolation is enforced redundantly, not in exactly one place — a single
missed `WHERE studioId = ...` shouldn't be enough to leak data.

1. **JWT/session claims.** Every authenticated studio-side request carries
   a `studioId` claim (see `packages/auth`), established at login and
   never trusted from client-supplied input (query params, body fields).
2. **Route/middleware layer.** Each app's API routes resolve the acting
   studio from the session, not from the URL or request body, before any
   database call.
3. **The tenant-scoped Prisma client** (`packages/database/src/tenant-client.ts`).
   `createTenantClient(prisma, studioId)` wraps the base client with a
   [Prisma Client Extension](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
   that automatically merges `studioId` into every tenant-scoped model's
   `where`/`data`, and **throws `CrossTenantAccessError`** if the calling
   code already specified a *different* `studioId` — which is far more
   likely to be a bug (a stale variable, a copy-pasted filter) than an
   intentional cross-tenant query.

   ```ts
   import { createTenantClient } from "@bcp/database";

   const db = createTenantClient(prisma, session.studioId);
   const leads = await db.studioUser.findMany(); // studioId filter is automatic
   await db.studioUser.create({ data: { email, name } }); // studioId injected
   ```

   The scoping decision logic (`scopeWhere`, `scopeData`,
   `isTenantScopedModel` in `tenant-scope.ts`) is pure and unit-tested
   independently of the Prisma runtime — see
   `src/__tests__/tenant-scope.test.ts`.
4. **Row-level checks in service functions**, for the handful of
   operations that touch more than one studio's data on purpose (see
   "Legitimate cross-tenant operations" below) — these use the plain
   (unscoped) client deliberately and are expected to filter explicitly,
   reviewed with extra scrutiny in code review.

No layer here is Postgres Row-Level Security (RLS). RLS was considered and
intentionally not used for v1: the application always knows the acting
studio from the session before it queries, so RLS would be enforcing an
invariant the app already guarantees, at the cost of every connection
needing `SET app.current_studio_id` correctly threaded through pooled
connections. It's a reasonable addition later as a last-resort backstop,
not a replacement for layers 1–3.

## Legitimate cross-tenant operations

A few operations genuinely need to see across studios, and use the plain
`PrismaClient` (never the tenant-scoped one) deliberately:

- **platform-admin** — a platform user with `tenant:view`/`tenant:manage`
  browsing/managing studios. Every such query is itself recorded in
  `AuditLog` with `actorType = platform_user`.
- **Platform-wide jobs** — e.g. a nightly sweep that checks every studio's
  `Subscription.endsAt` to move expiring ones into `grace`. These write
  `JobRecord` rows with `studioId = null`.
- **License validation** — an activation check looks up a `LicenseKey` by
  its `key` (globally unique) before it knows which studio it belongs to;
  once found, all *subsequent* operations for that request are re-scoped
  to that studio.

## Support impersonation

Not implemented in this schema phase, but designed for: a platform user
"viewing as" a studio would still go through `createTenantClient`, scoped
to the target studio's id, with the *platform* user's id recorded as
`actorId` (`actorType = platform_user`) on every `AuditLog` row it
produces — so impersonated actions are always attributable to the real
actor, not laundered through a studio user's identity.

## Users in multiple studios

`StudioUser` is a **membership**, not a global identity: a person who
works with two studios (e.g. a freelance second-shooter) has two separate
`StudioUser` rows, one per studio, each with its own `id`, and
`email` is unique **per studio** (`@@unique([studioId, email])`), not
globally. Concretely, `alex@example.com` can be a `StudioUser` at both
"Balloon Connect Photography" and "Frame & Co Studios" as two independent
rows with independent credentials, roles, and status.

This was a deliberate choice over a global-account-plus-memberships model
(the GitHub/Vercel-org pattern), for two reasons specific to this
platform:

1. **No model in the required schema represents a global account
   separate from `StudioUser`.** Introducing one would mean either an
   unlisted table or overloading `PlatformUser` for studio-side people,
   both of which blur the platform/studio boundary this document leans on
   for isolation guarantees.
2. **It matches how white-label studios actually operate today** — a
   photographer with a login at one studio doesn't expect that login to
   silently work at a different, unrelated studio's account, even if they
   used the same email address for both.

The tradeoff: the product layer (not this schema) is responsible for a
"which studio am I in?" switcher UI when the same email has multiple
`StudioUser` rows, and for keeping password resets scoped per-row rather
than resetting "the account" globally. If a future phase needs true
single-sign-on identity across studios, that's a new `Account` table with
`StudioUser.accountId` added — additive, not a rework of this design.

## Lifecycle states

`Studio.status` and `Subscription.status` both model the same real-world
lifecycle, at slightly different grains (account-level vs. this specific
subscription term):

```
 trial ──────► active ─────► grace ─────► suspended ─────► expired
   │              │  ▲          │                              │
   │              │  └──────────┘ (payment recovered)          │
   │              │                                             │
   └──────────────┴─────────────────────────────────────► cancelled
                     (cancellable from any state)
```

- **trial** — newly created, `Studio.trialEndsAt` set (typically 14 days).
- **active** — a paid `Subscription` in `active` status covers the studio.
- **grace** — payment/renewal failed or lapsed; `graceEndsAt` gives the
  studio a window (typically 7–14 days) to fix billing before suspension.
  Product access is typically unrestricted or lightly restricted during
  grace — the point is to avoid an abrupt cutoff for a fixable billing
  hiccup.
- **suspended** — grace expired without resolution, or a platform admin
  suspended the studio directly (ToS violation, fraud review, etc). Studio
  users cannot sign in; data is retained, not deleted.
- **expired** — a `LicenseKey`/`Subscription` term ended with no renewal
  at all (distinct from `suspended`, which implies an account that was
  active and lapsed). Same access restriction as suspended.
- **cancelled** — the studio (or platform, on their behalf) explicitly
  ended the relationship. `Studio.deletedAt` is set only when the studio
  is actually removed from active listings (soft delete), which normally
  happens some retention period after `cancelled`, not at the moment of
  cancellation.

`Subscription` keeps every transition as history (new rows), so "what plan
was this studio on when this incident happened" is always answerable from
`AuditLog` + `Subscription` rows, never overwritten in place.

## One-year licenses

`LicenseKey.issuedAt` / `expiresAt` are set exactly one year apart for the
standard yearly `billingCycle`. Renewal creates a **new** `LicenseKey` row
linked to the (renewed) `Subscription` rather than mutating `expiresAt` on
the old key — so a license key, once issued, is an immutable record of
"this key was valid from X to Y," which matters for support/audit
("which key was active when this activation happened?") and for offline
or slow-to-update client activations that cache a key's terms locally.

`LicenseKey.status` (`active`/`suspended`/`expired`/`revoked`) is
independent of `Studio.status` — a studio can be suspended for billing
reasons while its most recent license key is still technically
`active`-but-past-`expiresAt` (the application layer checks both `status`
and `expiresAt`, not `status` alone, when deciding whether to honor a
license).

## Verifying isolation

- `src/__tests__/tenant-scope.test.ts` unit-tests the pure scoping/merge
  logic without a database.
- Any new tenant-scoped model **must** be added to `TENANT_SCOPED_MODELS`
  in `tenant-scope.ts` in the same change that adds it to
  `schema.prisma` — there is intentionally no way to derive that list
  automatically from the schema, so it's a deliberate opt-in, reviewed in
  every PR that adds a model.
