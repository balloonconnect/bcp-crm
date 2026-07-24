# Authentication & Permissions

How sign-in, session management, and access control work across BCP
Studio OS. Implementation lives in `@bcp/auth` (crypto/protocol
primitives), `@bcp/permissions` (RBAC catalog + engine), and
`apps/api/src/{services,routes,plugins}` (the actual HTTP surface).

## The two identity planes, and why auth doesn't merge them

As established in `packages/database/docs/tenant-isolation.md`, platform
staff (`PlatformUser`) and studio-side people (`StudioUser`) are separate
tables that never share rows. Authentication follows the same split:
`apps/api/src/services/studio-auth.service.ts` and
`platform-auth.service.ts` implement near-identical login/lockout/2FA
logic against two different tables.

### Why studio and platform auth aren't merged into one generic service

A generic `AuthService<TActor>` parameterized over "which Prisma delegate"
was considered and rejected for this phase: the two tables have diverging
fields already (`StudioUser.branchId`, `Invitation`-based signup vs. no
open signup path for `PlatformUser` at all) and are likely to diverge
further. A thin generic abstraction over two call sites that already
differ saves little duplication today and would need to grow awkward
escape hatches as the two flows drift. Both services import the exact
same primitives from `@bcp/auth` (`hashPassword`, `evaluateLockout`,
`issueVerificationToken`, `verifyTwoFactorCode`, …), so the actual
security-critical logic is not duplicated — only the Prisma plumbing
around it is.

## What's implemented, and where

| Requirement | Where |
|---|---|
| Email + password | `studio-auth.service.ts` `login()`, `platform-auth.service.ts` `platformLogin()` |
| Google OAuth | `@bcp/auth/google-oauth.ts`, `studio-google-auth.service.ts`, `GET /auth/google`, `GET /auth/google/callback` |
| Email OTP (passwordless) | `@bcp/auth/otp.ts`, `requestOtpLogin`/`verifyOtpLogin` |
| Email verification | `@bcp/auth/verification-tokens.ts`, `requestEmailVerification`/`confirmEmailVerification` |
| Forgot / reset password | `requestPasswordReset`/`resetPassword` — resetting revokes every session |
| Two-factor authentication | `@bcp/auth/two-factor.ts` (TOTP via `otplib`), `studio-two-factor.service.ts` |
| Recovery codes | `@bcp/auth/recovery-codes.ts`, `RecoveryCode` model, `useRecoveryCode()` |
| Device history | `Session` rows *are* device history — see below |
| Session management | `Session` model, `refresh.service.ts`, `studio-sessions.service.ts` |
| Logout from all devices | `revokeAllSessions()`, `POST /auth/logout-all` |
| Login history | `LoginHistory` model, written on every attempt, `listLoginHistory()` |
| Account lockout | `@bcp/auth/lockout.ts`, escalating lock duration |
| Brute-force protection | Lockout (per-account) + rate limiting (per-account and per-IP) together |
| Rate limiting | `@bcp/auth/rate-limit.ts` rules, applied via `apps/api/src/plugins/rate-limit-auth.ts` |
| Platform-level RBAC | `@bcp/permissions` catalog + `requirePlatformPermission` guard |
| Studio-level RBAC | `@bcp/permissions` catalog + `requireStudioPermission` guard |
| Branch-level access | `@bcp/permissions/branch-access.ts`, `requireBranchAccess` guard |
| Resource permissions | `@bcp/permissions/resource-access.ts` (permission + branch + ownership) |
| Feature permissions | `@bcp/permissions/feature-flags.ts` resolution |
| Plan restrictions | `@bcp/permissions/plan-restrictions.ts` |
| API guards | `apps/api/src/plugins/auth-guard.ts` |
| UI permission hooks | `@bcp/permissions/client` — `usePermission`, `useBranchAccess`, `<Can>` |

## Never trust studioId from the browser

This is the platform's central security invariant, and it's enforced
differently before vs. after login:

- **Before login** (`resolveStudioIdForAuth` in
  `apps/api/src/services/resolve-studio-for-auth.ts`) — the client
  necessarily has to indicate *which studio's login form this is*, since
  no session exists yet to resolve one from. It does so via the request's
  hostname (a verified custom domain) or, on a shared host, an explicit
  `studioSlug`. This is **not** the same trust boundary as post-login
  access: supplying the wrong studio here only changes which studio's
  `StudioUser` table gets checked for matching credentials — it grants no
  access to anything. An attacker who guesses another studio's slug still
  needs that studio's actual password (or OTP, or Google account) to get
  anywhere.

- **After login** (`resolveTenantContext` in `@bcp/auth/tenant-resolution.ts`,
  wired into `apps/api/src/plugins/tenant-context.ts`) — every
  authenticated request's `studioId` comes from exactly three sources,
  **all of which must agree**:

  1. **Secure server session** — the `studioId` claim in the signed access
     token, established at login and never re-read from anything the
     client sends per-request.
  2. **Verified hostname** — if the request arrived on a custom domain, that
     domain's studio (only rows with `StudioDomain.verifiedAt` set) must
     match the session's studio, or the request is rejected.
  3. **Authenticated membership** — the actor must have an active
     `StudioUserRole` in that exact studio, checked fresh on every request.

  The function's own signature has no parameter for a studioId from
  anywhere else — there's no argument a route handler could accidentally
  wire up to `request.body.studioId` or `request.query.studioId`. See
  `apps/api/src/plugins/tenant-context.ts` for the real callbacks, and
  `packages/auth/src/__tests__/tenant-resolution.test.ts` for the test
  proving a mismatched hostname or missing membership is rejected even
  when the session studioId looks valid.

## Session lifecycle

```
login/otp/google/2fa-challenge
        │
        ▼
  Session row created ──────► access token (JWT, short-lived, 15m)
        │                     refresh token (opaque, httpOnly cookie, 30d)
        │
        ├── every request: access token verified + Session checked
        │   not revoked/expired (apps/api tenant-context.ts)
        │
        ├── POST /auth/refresh: refresh token rotated (old hash replaced),
        │   new access token issued
        │
        ├── POST /auth/logout: this Session revoked
        │
        └── POST /auth/logout-all: every non-revoked Session for this
            actor revoked (device history → "sign out everywhere")
```

Refresh tokens are **opaque random strings**, not JWTs — they're stored
hashed (`Session.refreshTokenHash`) and rotated on every use
(`refresh.service.ts`), so a replayed old refresh token (e.g. from a
stolen-but-already-used cookie) simply fails to match any session. Access
tokens are short-lived JWTs carrying only `sub`, `actorType`, `studioId`,
and `sessionId` — no permissions are embedded, so a role change takes
effect on the very next request rather than waiting for a token refresh
(see "Permissions are never cached" below).

### Why not argon2 for every secret

Three different "secret" types get three different treatments, on purpose:

- **Passwords** — `@bcp/auth/password.ts`, argon2 (slow, memory-hard —
  correct for user-chosen, potentially-weak secrets that need to resist
  offline brute force).
- **Refresh tokens, verification tokens (email verify / password reset /
  OTP), recovery codes** — `@bcp/auth/opaque-tokens.ts`, SHA-256. These
  are generated by us with `crypto.randomBytes`, already high-entropy, and
  single-use/short-lived — a fast hash is the right tool because there's
  no brute-force risk to defend against beyond guessing 256 random bits,
  and using argon2 here would only add latency with no security benefit.
- **TOTP secrets** — `@bcp/auth/secret-encryption.ts`, AES-256-GCM
  (reversible encryption, not hashing). Verifying a 6-digit code requires
  the *original* secret to recompute the expected code, so this is the one
  case where the plaintext must be recoverable — hashing would make 2FA
  unverifiable.

### Device history

There's no separate "Device" table. A device, for our purposes, is
whatever `userAgent` + `ipAddress` a `Session` row was created with —
listing a user's `Session` rows (via `GET /auth/sessions`) already gives
device history (browser/OS from the user agent, rough location from the
IP, first-seen via `createdAt`, last-active via `updatedAt`). This was a
deliberate simplification: a richer device-fingerprinting model (device
IDs, push tokens, trusted-device flags) is additive and can be layered on
top of `Session` later without a breaking change, but wasn't warranted for
this phase.

## Account lockout & brute-force protection

Two independent layers, because they defend against different attack
shapes:

- **Rate limiting** (`@bcp/auth/rate-limit.ts`, enforced by
  `@fastify/rate-limit` via `apps/api/src/plugins/rate-limit-auth.ts`) —
  caps requests per IP *and* per submitted email independently. Cheap for
  an attacker to partially evade (many IPs), but raises the cost and
  catches the common case.
- **Account lockout** (`@bcp/auth/lockout.ts`) — the real backstop.
  `StudioUser`/`PlatformUser.failedLoginAttempts` increments on every
  wrong password; at 5 failures the account locks with an **escalating**
  duration (5m → 15m → 1h → 24h, capped) tracked via `lockedUntil`. A
  correct login resets the counter to 0. Escalation means a single typo
  costs 5 minutes, but a sustained attack costs a full day per 5 guesses —
  read `evaluateLockout()`'s tests for the exact schedule.

Account enumeration is avoided throughout: `requestPasswordReset` and
`requestOtpLogin` always return success regardless of whether the email
matches an account, and failed logins don't distinguish "no such account"
from "wrong password" in the HTTP response (only in `LoginHistory`'s
internal `failureReason`, for the studio's own audit trail).

## RBAC: platform and studio roles

Catalog lives in `@bcp/permissions/catalog.ts` — the single source of
truth both `pnpm db:seed` and every runtime permission check are built
from. Platform roles are fixed (5); studio roles ship 11 system roles per
studio and support additional custom roles with any permission subset
(see `packages/database/docs/database-conventions.md` § "Roles &
permissions" for why permissions are a flat array on the role, not a
normalized join table).

**Platform**: Super Admin, Platform Admin, Platform Support, Platform
Finance, Platform Viewer.

**Studio**: Owner, Admin, Manager, Sales, Photographer, Videographer,
Editor, Album Designer, Accountant, Freelancer, Viewer — see
`STUDIO_ROLE_DEFINITIONS` for the exact permission grants; broadly, Owner/
Admin get near-full access (billing stays Owner-only), Manager runs
day-to-day operations, Sales/Photographer/Videographer/Editor/Album
Designer/Accountant each get a narrow slice matching their job, Freelancer
is deliberately restrictive (external contractor), and Viewer is
read-only across everything.

### Permissions are never cached

Every permission check loads the actor's current roles fresh from the
database (`apps/api/src/plugins/permission-context.ts`), not from the JWT
or any cache. This means revoking a role, or an admin downgrading someone
mid-session, takes effect on that person's *very next request* — there's
no "wait for token refresh" window where a revoked permission still works.
The cost is one extra query per permission-guarded request; that tradeoff
was chosen deliberately over the security gap a cached permission set
would introduce.

### Branch-level access

A studio user with `branchId = null` isn't restricted to one branch (this
mirrors the same nullable-branch convention documented in
`packages/database/docs/database-conventions.md`); a user with a specific
`branchId` only sees that branch's data. `requireBranchAccess()` enforces
this on any route with a `:branchId` param, and
`@bcp/permissions/resource-access.ts`'s `canAccessResource()` folds the
same check into general resource-level authorization alongside the
permission catalog and an optional ownership override.

### Feature permissions & plan restrictions

Both are pure-function checks (`@bcp/permissions/feature-flags.ts`,
`plan-restrictions.ts`) that route handlers call before performing a
gated action — e.g. before enabling WhatsApp automation, resolve the
feature flag (studio override → global default → plan default) and
`assertFeatureEnabled`; before creating a 4th branch on a 3-branch plan,
`checkPlanLimit(currentBranches, plan.maxBranches)` and
`assertWithinPlanLimit`. Both throw typed errors
(`FeatureNotEnabledError`, `PlanLimitExceededError`) that
`apps/api/src/plugins/error-handler.ts` maps to HTTP 402.

## API guards

`apps/api/src/plugins/auth-guard.ts` exposes three preHandler factories,
composed per-route:

```ts
app.post(
  "/studio/:branchId/bookings",
  { preHandler: [app.authenticate, requireStudioPermission("booking:manage"), requireBranchAccess()] },
  handler,
);
```

`app.authenticate` (from `tenant-context.ts`) resolves and verifies the
actor + tenant; `requireStudioPermission`/`requirePlatformPermission` load
a fresh permission context and assert the permission; `requireBranchAccess`
checks the branch param against that context. Every guard failure is a
typed error mapped to a consistent HTTP status by
`apps/api/src/plugins/error-handler.ts` (`GUARD_ERROR_STATUS` in
`@bcp/permissions/api-guard.ts`).

## UI permission hooks

`@bcp/permissions/client` exports `PermissionProvider`, `usePermission`,
`usePermissions`, `useBranchAccess`, and a `<Can permission="...">`
component for declarative conditional rendering. The provider's `value`
comes from the server (e.g. an app's session-bootstrap call returning the
resolved permission list) — never computed or trusted client-side:

```tsx
<PermissionProvider value={{ actorType: "studio_user", permissions, branchId }}>
  <Can permission="booking:manage" fallback={<ReadOnlyBookingView />}>
    <BookingEditor />
  </Can>
</PermissionProvider>
```

Hiding a button with `usePermission` is a UX nicety, not a security
boundary — the corresponding API route is guarded independently server-side
regardless of what the client renders.
