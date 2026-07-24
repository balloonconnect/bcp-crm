# Platform Super Admin

`apps/platform-admin` is BCP Studio OS's internal console — where platform
staff (not studio users) manage the whole business: every studio, every
subscription, every license, the infrastructure underneath, and the
day-to-day support workload. This document covers its architecture; the
dashboard metrics and module list from the spec are covered field-by-field
below.

## Separate authentication and permission layer

This is the load-bearing requirement, and it's true at every layer, not
just "there's a different login form":

| | Studio CRM | Platform Super Admin |
|---|---|---|
| Identity table | `StudioUser` | `PlatformUser` |
| Role table | `StudioRole` (11 system roles + custom) | `PlatformRole` (5 fixed roles) |
| Permission catalog | `STUDIO_PERMISSIONS` (`@bcp/permissions`) | `PLATFORM_PERMISSIONS` (`@bcp/permissions`) |
| Login endpoint | `POST /auth/login` | `POST /platform-auth/login` |
| Refresh token cookie | `bcp_refresh_token`, scoped to `/auth` | `bcp_platform_refresh_token`, scoped to `/platform-auth` |
| Session `actorType` | `studio_user` | `platform_user` |
| Guard | `requireStudioPermission()` | `requirePlatformPermission()` |
| Frontend app | `apps/studio-web` | `apps/platform-admin` |

A `PlatformUser` and a `StudioUser` are different database rows in
different tables (see `packages/database/docs/tenant-isolation.md` §
"The two identity planes") — there is no shared "User" table underneath
that a bug could accidentally cross. A platform staff member's session
(`Session.actorType = "platform_user"`) can never satisfy a
`requireStudioPermission()` guard, and vice versa, because the permission
context loaders (`loadStudioPermissionContext`/`loadPlatformPermissionContext`
in `apps/api/src/plugins/permission-context.ts`) each query only their own
table. Having platform staff access to *any* studio's data (e.g. for
support) is not implicit from being staff — see
`packages/database/docs/tenant-isolation.md` § "Support impersonation" for
how that's designed to work when built.

On the frontend, `apps/platform-admin`'s `PlatformAuthProvider`
(`src/lib/auth-context.tsx`) talks exclusively to `/platform-auth/*` and
is a completely separate React context/provider tree from anything
`apps/studio-web` would use — the two apps don't even share a session
token format beyond both being JWTs signed with the same `AUTH_SECRET`
(the claims differ: `actorType` and `studioId` distinguish them, and
`studioId` is always `null` for a platform session).

## Platform roles

Fixed set of 5 (`@bcp/permissions/catalog.ts`): **Super Admin**,
**Platform Admin**, **Platform Support**, **Platform Finance**,
**Platform Viewer** — see `docs/authentication.md` for the full
permission grant per role. Unlike studio roles, these aren't customizable
per the product's own design (this is BCP Studio OS's own staff
structure, not something individual studios configure).

## Dashboard metrics

All 16 computed live in `apps/api/src/services/platform/metrics.service.ts`
(`getDashboardMetrics()`), not from a periodically-refreshed cache — see
that file's docstrings for the exact formula behind each one. Summary:

| Metric | How it's computed |
|---|---|
| Total / Active / Trial / Expired / Suspended studios | `Studio.count()` grouped by `status` |
| MRR | Sum of every `active`/`grace`/`past_due` subscription's plan price, yearly subscriptions divided by 12 |
| ARR | `MRR × 12` |
| Renewals | Subscriptions ending in the next 30 days |
| Churn | Subscriptions cancelled in the last 30 days, as a % of (active + cancelled) |
| Storage / AI / WhatsApp / Email usage | Current month's `UsageRecord` rows, summed by metric |
| Payment success | `Payment` rows from the last 30 days, succeeded ÷ (succeeded + failed) |
| Failed background jobs | `JobRecord` rows with `status = "failed"` in the last 24h |
| System health | Database connectivity + failed-job rate, rolled into `healthy`/`degraded`/`unhealthy` |

## The 18 modules

Every module has a real, working page in `apps/platform-admin/src/app/`
and a real, tested backend endpoint in `apps/api/src/routes/platform-admin.routes.ts`
— none of this is mocked. Six modules (Studios, Feature Flags, Job
Monitoring, Health Monitoring, Audit Logs, and the Dashboard) additionally
demonstrate mutation flows (suspend/reinstate, toggle, retry, publish,
resolve) end to end; the rest follow the identical
`ResponsiveDataView` + `useApiGet` list-page pattern, since the module
list is intentionally uniform (every module is fundamentally "browse a
filtered, paginated list of platform-visible records").

| Module | Page | Endpoint(s) | Permission |
|---|---|---|---|
| Studios | `/studios` | `GET/POST /platform/studios*` | `studio:view`, `studio:suspend` |
| Users | `/users` | `GET /platform/users/{platform,studio}` | `studio:view`, `platform_user:manage` |
| Plans | `/plans` | `GET/PATCH /platform/plans` | `plan:manage` |
| Subscriptions | `/subscriptions` | `GET /platform/subscriptions` | `studio:view` |
| Licenses | `/licenses` | `GET/POST /platform/licenses*` | `license:issue`, `license:revoke` |
| Activations | (nested under a license's detail) | `GET /platform/licenses/:id/activations` | `license:issue` |
| Payments | `/payments` | `GET /platform/payments` | `payment:view` |
| Domains | `/domains` | `GET /platform/domains` | `studio:view` |
| Storage | `/storage` | `GET /platform/storage` | `storage:view` |
| AI Providers | `/providers/ai` | `GET /platform/providers/ai` | `system_config:manage` |
| Messaging Providers | `/providers/messaging` | `GET /platform/providers/messaging` | `system_config:manage` |
| Feature Flags | `/feature-flags` | `GET/PUT /platform/feature-flags` | `feature_flag:manage` |
| Announcements | `/announcements` | `GET/POST /platform/announcements*` | `announcement:manage` |
| Support Requests | `/support-requests` | `GET/POST /platform/support-requests*` | `support_request:manage` |
| Audit Logs | `/audit-logs` | `GET /platform/audit-logs` | `studio:view` |
| System Configuration | `/system-config` | `GET/PUT /platform/system-config` | `system_config:manage` |
| Job Monitoring | `/jobs` | `GET/POST /platform/jobs*` | `job:manage` |
| Health Monitoring | `/health` | `GET /platform/health` | `health:view` |

Every route is guarded with both `app.authenticate` (resolves and
verifies the `PlatformUser` session) and `requirePlatformPermission(...)`
(asserts the specific permission) — see `apps/api/src/plugins/auth-guard.ts`.
The nav itself (`apps/platform-admin/src/lib/nav.ts`) filters to only the
modules the signed-in user's permissions actually allow, via
`@bcp/permissions/client`'s `usePermission`/`<Can>` — a role without
`system_config:manage` simply never sees the AI/Messaging Providers or
System Configuration items in the sidebar.

## AI / Messaging providers: status only, never secrets

`listAiProviders()`/`listMessagingProviders()`
(`apps/api/src/services/platform/infrastructure.service.ts`) report
**whether** a provider is configured (an env var is present), never the
credential itself. API keys and secrets live in server environment
variables (`ANTHROPIC_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `SMTP_HOST`, …)
and are never written to the database or returned by any API response —
this module is connection-status visibility, not a secrets manager.

## New data models this phase added

`PlatformSetting` (system configuration), `Announcement` (platform-wide
banners), `SupportRequest` (studio → platform tickets), and `Payment`
(billing transaction attempts, backing the Payments module and the
payment-success-rate metric) — see `packages/database/prisma/schema.prisma`
and migration `20260710000500_platform_admin`. `SupportRequest.assignedTo`
and `AuditLog`'s platform-actor rows are the two places platform and
studio data legitimately touch, using the same soft-reference-actor-id
pattern documented in `packages/database/docs/database-conventions.md` §
"Identifiers".
