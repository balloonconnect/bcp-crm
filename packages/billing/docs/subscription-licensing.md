# Subscription & Licensing

How BCP Studio OS models plans, enforces their limits, and manages the
one-year license keys studio deployments activate against. Implementation
lives in `@bcp/billing` (pure plan/license logic), `@bcp/database`'s
`SubscriptionPlan`/`Subscription`/`LicenseKey`/`Activation` models, and
`apps/api`/`apps/worker`'s enforcement wiring.

## The 5 plans

`starter`, `professional`, `business`, `enterprise`, `custom` —
`@bcp/billing/src/plans.ts`'s `PLAN_DEFINITIONS` is the single source of
truth, seeded verbatim by `pnpm db:seed`. `enterprise` and `custom` both
ship with every limit set to `null` (unlimited) by default; the
difference is intent, not mechanism — `enterprise` is a fixed high tier,
`custom` is a per-studio negotiated starting point platform-admin is
expected to dial in via `PATCH /platform/plans/:id` or a studio-specific
override.

## The 16 plan-limit dimensions

`@bcp/billing/src/plan-limits.ts`'s `planLimitsSchema` defines all 16,
stored as one JSON object on `SubscriptionPlan.limits`:

| Dimension | Kind | Metered by |
|---|---|---|
| Users | Standing count | `StudioUser.count()` |
| Branches | Standing count | `StudioBranch.count()` |
| Storage | Standing count (GB) | `UsageRecord` (`storage_gb`, set by a storage-accounting job) |
| Leads | Standing count | *(reserved — no Lead model yet; wiring point documented below)* |
| Clients | Standing count | *(reserved — no Client model yet)* |
| Events | Standing count | *(reserved — no Event model yet)* |
| Galleries | Standing count | *(reserved — no Gallery model yet)* |
| Monthly uploads | Monthly quota | `UsageRecord` (`uploads`) |
| AI face searches | Monthly quota | `UsageRecord` (`ai_face_searches`) |
| AI analysis jobs | Monthly quota | `UsageRecord` (`ai_analysis_jobs`) |
| WhatsApp messages | Monthly quota | `UsageRecord` (`whatsapp_messages`) |
| Email messages | Monthly quota | `UsageRecord` (`emails_sent`) |
| Custom domains | Standing count | `StudioDomain.count()` |
| White-label access | Feature gate (boolean) | n/a |
| API access | Feature gate (boolean) | n/a |
| Automation runs | Monthly quota | `UsageRecord` (`automation_runs`) |

### Why one JSON field instead of 16 typed columns

`packages/database/docs/database-conventions.md` originally argued for
typed columns on `SubscriptionPlan` specifically so limits stayed
queryable in SQL — and that was the right call for **4** limits. At **16**,
with a third of them booleans and half of them monthly-resetting quotas
rather than standing counts, 16 nullable columns would mean every plan
change touches a migration, and the "queryable in SQL" benefit was
already moot in practice: every real limit comparison happens in
`@bcp/billing`'s application-layer logic (`evaluateUsageWarning`), not a
`WHERE` clause. `limits: Json` with a zod schema (`planLimitsSchema`)
gives the same type safety at the application boundary without the
migration cost — see migration `20260710000600_subscription_licensing`
for the backfill that carried the four original typed columns' data into
the new shape before dropping them.

### Dimensions with no backing model yet

Leads/Clients/Events/Galleries are defined in the schema (so plan configs
and the usage-dashboard UI are already complete and forward-compatible)
but have no metering wired in yet, since those business-object models
don't exist in this phase (consistent with the project's phased build
order — see the root README). When those models are built, their create
paths get the same one-line `assertWithinPlanLimit(studioId, "maxLeads")`
call `acceptInvitation`/`addDomain` already demonstrate below — no schema
or `@bcp/billing` change required.

## Warnings at 70/85/95/100%

`@bcp/billing/src/limit-warnings.ts`:

- `evaluateUsageWarning(current, limit)` — the read path. Returns a
  `level` (`"ok"` or one of `70`/`85`/`95`/`100`) and the underlying
  `PlanLimitCheck` from `@bcp/permissions` (which already handles `null`
  = unlimited). This is what `GET /billing/usage` returns per dimension
  for a studio's usage dashboard.
- `crossedNewThreshold(previousCount, newCount, limit)` — the write path.
  Returns the threshold *just* crossed by this specific increment (or
  `null`), so `apps/api/src/services/plan-limit-enforcement.ts` can fire
  exactly one in-app `Notification` per threshold per period, not one per
  request once past the line.

Both build on `@bcp/permissions`' existing `checkPlanLimit` (from the
authentication/RBAC phase) rather than duplicating the allowed/not-allowed
logic — `@bcp/billing` only adds the four-tier warning granularity this
spec needs on top of that.

## License functionality

`LicenseKey` (see `packages/database/prisma/schema.prisma`) plus
`@bcp/billing/src/license-lifecycle.ts` and `activation-policy.ts`:

| Requirement | Where |
|---|---|
| Unique activation key | `LicenseKey.key`, unique, generated via `@bcp/auth`'s `generateOpaqueToken` |
| One-year validity | `computeOneYearExpiry()` — exactly 365 days from `issuedAt` |
| Start date | `LicenseKey.issuedAt` |
| Expiry date | `LicenseKey.expiresAt` |
| Maximum activations | `LicenseKey.maxActivations`, enforced in `validateActivationAttempt()` |
| Allowed studio | `LicenseKey.studioId` — a license only activates for the studio it was issued to, checked in `validateActivationAttempt()` |
| Allowed domains | `LicenseKey.allowedDomains` (empty = unrestricted), checked in `validateActivationAttempt()` |
| Activation history | Every `Activation` row for a `LicenseKey`, queried via `listActivations()` |
| Device metadata | `Activation.deviceMetadata` (freeform JSON — OS, app version, device model) |
| IP metadata | `Activation.ipAddress` |
| Revoke | `LicenseStatus.revoked`, `revokeLicense()` — terminal, `isLicenseUsable()` always `false` |
| Suspend | `LicenseStatus.suspended`, `suspendLicense()`/`reinstateLicense()` — reversible, unlike revoke |
| Renew | `renewLicense()` — issues a **new** `LicenseKey` row rather than mutating `expiresAt`; see below |
| Grace period | `LicenseKey.graceEndsAt`, `LicenseStatus.grace`, `resolveEffectiveStatus()` |

### Renewal creates a new key, not a mutation

Same reasoning as documented in
`packages/database/docs/tenant-isolation.md` § "One-year licenses":
`renewLicense()` issues a **new** `LicenseKey` row (new `key`, fresh
`issuedAt`/`expiresAt`), copying over `seatsAllowed`/`maxActivations`/
`allowedDomains` from the previous one. The old key is left untouched —
its own status and expiry keep telling the truth about the term it
covered — rather than overwritten, so "what was this studio's license
situation on date X" is always answerable from history, the same
principle the platform's audit logging follows everywhere else.
`canRenew()` gates this to licenses that are in `grace`/`expired` status,
or within 60 days of expiring — not any time, to avoid an accumulating
pile of near-simultaneous "renewals."

### Effective status vs. stored status

`resolveEffectiveStatus()` is the one function that should be trusted for
anything access-critical, not the raw `LicenseKey.status` column — a
license's clock keeps advancing (`active` → `grace` → `expired`) even if
no background job has run to flip the stored value at the exact instant
it crosses a boundary. `revoked` and `suspended` are the two states that
always win regardless of dates (an explicit platform action shouldn't be
silently overridden by date math).

## Enforcement

Every required enforcement point has either a real, wired integration or
a documented reason it's a reserved wiring point (no backing feature
exists yet):

| Requirement | Status | Where |
|---|---|---|
| API | **Wired** | `assertWithinPlanLimit()` in `acceptInvitation()` (user creation) and `addDomain()` (domain creation) — see below |
| Workers | **Wired** | `apps/worker/src/lib/plan-limit-guard.ts`, used by `ai-analysis.worker.ts` |
| AI jobs | **Wired** | Same `ai-analysis.worker.ts` — checks `maxAiAnalysisJobsPerMonth` before running, records usage after |
| User creation | **Wired** | `studio-auth.service.ts`'s `acceptInvitation()` checks `maxUsers` before creating the `StudioUser` row |
| Domain creation | **Wired** | `domains.service.ts`'s `addDomain()` checks `maxCustomDomains` before creating the `StudioDomain` row |
| Uploads | Reserved | No upload endpoint exists yet (would call `assertWithinPlanLimit(studioId, "maxMonthlyUploads")` the same way) |
| Notifications | Reserved | Notification *sending* isn't built yet as a business feature; the enforcement mechanism (`assertWithinPlanLimit`) already covers WhatsApp/email dimensions the moment a send path exists |

### `assertWithinPlanLimit` — the one function everything calls

`apps/api/src/services/plan-limit-enforcement.ts`'s `assertWithinPlanLimit(studioId, dimension, increment?)`:

1. Resolves the studio's current plan limits (`resolveStudioPlanLimits` —
   reads the most recent non-terminal `Subscription` → its `plan.limits`;
   fails **open**, not closed, if a studio somehow has no subscription
   row, so a billing data gap doesn't lock a studio out entirely).
2. Reads current usage for that dimension — a live count for standing
   dimensions, this month's summed `UsageRecord` for monthly ones.
3. Throws `PlanLimitExceededError` (`@bcp/permissions`, already mapped to
   HTTP 402 by the error handler) if the projected usage would exceed the
   limit.
4. Otherwise, fires an in-app `Notification` to the studio's Owner/Admin
   users the moment a new 70/85/95/100% threshold is crossed, and returns
   the current warning level.

The worker-side equivalent (`apps/worker/src/lib/plan-limit-guard.ts`)
duplicates the thin Prisma-querying wrapper (not the underlying
`@bcp/billing` decision logic, which is shared) since `apps/api` and
`apps/worker` are separate deployables — see that file's docstring for
why a shared package for two call sites wasn't worth introducing yet.

## API surface

- `GET /billing/usage` — session-authenticated. Every numeric dimension's
  current usage, limit, and warning level in one response, for a studio's
  own usage dashboard.
- `POST /licenses/activate` — **key-authenticated**, not
  session-authenticated (see below).
- Platform-admin: `POST /platform/licenses`, `POST /platform/licenses/:id/{revoke,suspend,reinstate,renew}`,
  `GET /platform/licenses/:id/activations`, `POST /platform/activations/:id/deactivate`.

### Why activation isn't session-authenticated

`POST /licenses/activate` is called by a studio's deployment/installer or
an app binary — often *before* any human has signed into anything. It
authenticates via the license key itself (a high-entropy secret, the same
trust model as an API key) rather than a `PlatformUser`/`StudioUser`
session. Re-activating the same device (matched by `fingerprint`) is
idempotent — it refreshes `lastSeenAt` rather than consuming another slot
against `maxActivations`, so a deployment restarting doesn't slowly eat
its own activation budget.
