# Security Guide

A practical account of the security controls actually implemented in
this platform — what exists, where it lives, and why each control is
shaped the way it is. This is the reference for anyone auditing,
extending, or operating BCP Studio OS.

## Authentication & session security

- **Password hashing** — `@bcp/auth`'s `password.ts` (bcrypt), never
  reversible, never logged.
- **Brute-force prevention** — `@bcp/auth`'s `lockout.ts`: failed
  login attempts are counted per account and trigger a temporary
  lockout with exponential backoff, independent of rate limiting at
  the network layer.
- **Rate limiting** — `@fastify/rate-limit` globally (100 req/min per
  IP), plus tighter, purpose-specific limits on auth endpoints
  (`apps/api/src/plugins/rate-limit-auth.ts`) keyed by email where
  relevant, so a single IP can't brute-force many accounts and a
  single account can't be hammered from many IPs.
- **Secure cookies** — every session cookie (`bcp_refresh_token`,
  `bcp_platform_refresh_token`) is `httpOnly`, `secure`, and
  `sameSite: lax`. The refresh token itself is never readable by
  JavaScript on any origin, including this app's own.
- **CSRF protection** — this platform's protected routes are
  authorized by a Bearer access token, not a cookie, which is
  inherently CSRF-resistant (a forged cross-site request can't attach
  a token stored in JS memory). The one exception is the
  cookie-triggered `/auth/refresh` endpoint; it's protected by a
  genuine double-submit CSRF cookie (`bcp_csrf_token`, non-httpOnly,
  compared to an `X-CSRF-Token` header via constant-time comparison —
  see `@bcp/auth`'s `csrf.ts`) issued alongside the refresh cookie.
- **Suspicious-login alerts** — `@bcp/auth`'s `isSuspiciousLogin()`
  flags a login only when *neither* the IP address nor the user agent
  matches any of the account's recent sessions (so a traveling user on
  a known device, or a known network on a new device, is never falsely
  flagged). A flagged login writes an audit-log entry and sends an
  email alert — best-effort, never blocking the login itself.
- **2FA** — TOTP-based, with recovery codes, already integrated into
  both the studio and platform login flows.

## Network & transport

- **CORS** — an explicit resolver (`apps/api/src/plugins/cors-origin.ts`),
  not a wildcard. Allows the platform's own known frontend origins
  (`CORS_ALLOWED_ORIGINS`) plus, dynamically, any origin that is a
  studio's own *verified* custom domain (checked against the database
  on each request, never cached indefinitely). This replaced an
  earlier `origin: true` misconfiguration that, combined with
  `credentials: true`, would have allowed any website to make
  authenticated requests against this API from a victim's browser —
  found and fixed as part of this hardening pass, not a design that
  was always this way.
- **CSP** — explicit `helmet` directives (`apps/api/src/app.ts`): no
  script or style sources beyond `'self'`, no framing, no plugin
  content. This API only ever serves JSON plus the occasional
  PDF/CSV/image passthrough, so the policy is deliberately locked
  down rather than left at permissive defaults.
- **Signed URLs** — every direct file access (gallery photos, exports,
  backups, invoices) goes through `StorageClient.getSignedGetUrl()`
  with a bounded expiry, never a permanently-public object URL.

## Input & data handling

- **Input validation** — every route parses its input through a zod
  schema (see `@bcp/validation` and the many per-feature validation
  modules) before it reaches business logic; malformed input is
  rejected at the boundary, not defensively checked deep in a service
  function.
- **File validation** — upload routes check MIME type and enforce a
  size ceiling (`@fastify/multipart`'s configured limit plus per-route
  checks) before accepting a file.
- **SQL injection prevention** — every database query goes through
  Prisma's parameterized query builder; this codebase has no raw SQL
  string concatenation anywhere in application code.
- **Secret encryption** — `@bcp/auth`'s `secret-encryption.ts` encrypts
  sensitive values (2FA secrets, third-party API credentials) at rest;
  `apps/api`'s backup service uses AES-256-GCM (an authenticated
  cipher — tampering is detected, not silently accepted) for full-studio
  backups, with the key coming only from a dedicated environment
  variable.
- **Tenant isolation** — see [docs/tenant-isolation.md](../packages/database/docs/tenant-isolation.md)
  for the full architecture (JWT claims, route middleware, the
  `createTenantClient` Prisma extension, and row-level service
  checks). `packages/database`'s test suite includes a completeness
  check that parses the real Prisma schema and fails if any model with
  its own `studioId` isn't in the tenant-scoping allowlist — this
  check caught and let us fix a real gap (`EventProductPricing`,
  introduced several prompts earlier) during this very hardening pass.

## Audit & accountability

- **Audit logs** — `AuditLog` is append-only and already covers
  authentication events, data mutations across nearly every feature,
  and now suspicious-login detections specifically.

## Dependency & secret scanning

- **Dependency scanning** — `pnpm run security:audit` runs `pnpm audit
  --audit-level=high` across the whole workspace. Recommended: wire
  this into CI as a required check on every pull request, and
  separately subscribe the repository to GitHub's Dependabot (or
  equivalent) for automated version-bump PRs.
- **Secret scanning** — `pnpm run security:secrets-scan` runs
  `scripts/secrets-scan.sh`, a dependency-free pattern scanner for
  common secret shapes (AWS keys, private key blocks, API-token
  patterns, generic `*_SECRET`/`*_PASSWORD` assignments). This is a
  real, runnable baseline — not a replacement for a dedicated tool.
  **Recommended for production use:** run `gitleaks detect` (or
  `trufflehog`) in CI on every push, which catches patterns and
  entropy this simple script can't.

## Data lifecycle

- **Data export** — `GET /account/export` (personal data export for
  the signed-in user) and Prompt 41's studio-wide CSV/PDF exports
  (business data, not personal).
- **Account deletion** — `POST /account/delete`: soft-deletes the
  account and scrubs personally identifying fields (name, email,
  phone, password hash, 2FA secret) while preserving referential
  integrity for records this person is legitimately tied to (invoices,
  audit trail, completed tasks) — see
  [docs/data-deletion-policy.md](data-deletion-policy.md) for the full
  reasoning.
- **Studio deletion** — carries the same Platform Admin approval gate
  as encrypted backup/restore: a studio can request; only a
  `PlatformUser` can approve, reject, or trigger the actual run. See
  [docs/data-deletion-policy.md](data-deletion-policy.md).
- **Backup encryption** — see
  [docs/import-export-backup.md](import-export-backup.md) (Prompt 41)
  for the full AES-256-GCM + Platform Admin approval design.

## What this pass found and fixed, stated plainly

1. **CORS misconfiguration** (`origin: true` + `credentials: true`) —
   a real, exploitable bug, not a hardening nicety. Fixed.
2. **CSP with no explicit directives** — replaced helmet's unexamined
   defaults with a locked-down policy scoped to what this API actually
   serves.
3. **No CSRF protection anywhere** — added a genuine double-submit
   cookie mechanism for the one cookie-authorized action in the
   platform (token refresh).
4. **A real tenant-isolation gap** — `EventProductPricing` had its own
   `studioId` but was missing from the tenant-scoping allowlist since
   the prompt that introduced it. Caught by a new automated
   completeness test, fixed immediately.

## Known, stated gaps

- Dependency and secret scanning are documented processes with a
  runnable local script; neither is wired into an actual CI pipeline
  in this repository (no CI config exists here to wire into).
- Studio hard-deletion (the physical row purge after the soft-delete
  and access revocation) is a deliberately separate, delayed
  operational step — see the data deletion policy for why.
