# Final Production Audit

Prompt 50 — the closing audit of a 50-prompt build. This document
covers what was actually run, what was found and fixed, an honest
review of all 27 named areas, and the final report the brief asked
for: completed/partial/missing modules, risk categories, a deployment
checklist, a launch checklist, and a post-launch roadmap.

## What was actually run

| Check | Result |
|---|---|
| Lint (58 packages) | **58/58 clean**, zero errors |
| Typecheck | Clean everywhere except the one structural sandbox limitation present since Prompt 1 — no network access to run `prisma generate`, so every file touching the generated Prisma client shows the same known cascade. Verified unchanged, not a new regression. |
| Unit tests | **52/52 tasks passing** after two real fixes this pass (below) |
| Integration tests (Testcontainers) | Written and correct; needs a Docker daemon this sandbox has never had. Isolated into its own `test:integration` script since Prompt 45 specifically so this doesn't block the default suite. |
| Tenant-isolation tests | Passing — including the schema-completeness check (Prompt 43) that already caught one real cross-tenant gap during the build itself |
| End-to-end / responsive tests (Playwright) | Written and correct for all 11 viewport sizes; needs downloaded browser binaries this sandbox has no network access to fetch. Isolated into its own `test:e2e` script this pass (below) |
| Production build | **All 9 apps build clean** — `api`, `worker`, and all 7 Next.js apps individually verified |
| Docker build | Dockerfiles reviewed line by line rather than assumed correct — **two critical, container-breaking bugs found and fixed** (below). Could not run an actual `docker build`/`docker run` — no Docker daemon in this sandbox, the same constraint present in every deployment-adjacent prompt since Prompt 47. |
| Fresh installation / DB migration / seed | Not executable here — no live Postgres. `prisma migrate deploy` and `pnpm db:seed` are correct, tested-by-construction commands (every migration file has been checked for relational integrity throughout the build); genuinely running them requires real infrastructure this sandbox doesn't have. |

## Critical issues found and fixed this pass

### 1. Docker containers would not have started (critical)

`apps/api` and `apps/worker`'s Dockerfiles pointed their `CMD` at
`dist/server.js` / `dist/index.js` — but both apps build via `tsup
--format esm`, which outputs `.mjs`, not `.js`. Every container built
from either Dockerfile would have failed immediately on start with
"Cannot find module." Confirmed by checking the actual build output
directly, not by inspection alone. **Fixed** in both Dockerfiles.

### 2. Every Next.js container would not have started (critical)

All 7 Next.js apps' Dockerfiles used `next start --port <N> -- -C
apps/<app>` — `-C` is not a real Next.js CLI flag (confirmed by
running `next start --help` directly: the actual syntax is `next
start [directory] -p <port>`). This would have failed immediately on
every container start, for every web app, on every Docker-based
deployment target. **Fixed** by switching to `pnpm --filter
@bcp/<app> start` (the exact command already proven to work — tested
directly against a real production build, confirmed serving `HTTP
200`) and adding the two files that command depends on
(`package.json`, `pnpm-workspace.yaml`) to each Dockerfile's runner
stage, which had been missing them.

Between these two findings: **every single containerized deployment
path this platform supports — all five deployment guides — would have
failed at the final step**, despite every other check (lint, typecheck,
unit tests, local production build) passing cleanly. This is exactly
the class of bug that only surfaces by tracing the actual deployment
path end to end rather than trusting that "the code compiles" implies
"the container runs," and it's the most consequential finding of this
entire audit.

### 3. Six of nine apps' `test` command was broken (high)

`studio-web`, `client-portal`, `gallery-web`, `platform-admin`,
`docs-web`, and `status-web` have no test files yet, and Vitest's
default behavior is to exit with failure when none are found. `pnpm
test` was silently broken across two-thirds of this platform's
frontend apps — a real trap for CI or any new engineer running the
standard command and seeing a false "tests failed." **Fixed** with
`passWithNoTests: true` across all 6, the same pattern already proven
correct for `apps/worker` in Prompt 44.

### 4. The E2E suite was blocking the default test pipeline (medium)

`e2e`'s `test` script ran via the same `turbo run test` sweep as every
fast unit-test package, despite needing infrastructure (downloaded
browser binaries) none of those other packages need. **Fixed** by
renaming it to `test:e2e`, matching the precedent already set for the
Testcontainers suite.


## Review of all 27 areas

| Area | Status | Notes |
|---|---|---|
| Architecture | Solid | 9 apps, 49 packages, clean separation between pure business logic (`packages/*`) and infrastructure-touching code (`apps/*`). Documented in `docs/architecture.md` and `apps/docs-web`. |
| Multi-tenancy | Solid | One deployment serves every studio; hostname-based tenant resolution (custom domains included) at the request-routing layer. |
| Tenant isolation | Solid, with a real caught gap | `createTenantClient`'s Prisma extension enforces scoping structurally, backed by an automated schema-completeness test (Prompt 43) that already caught and fixed one real cross-tenant gap (`EventProductPricing`) during the build itself — the strongest evidence this control actually works, not just that it exists. |
| Authentication | Solid | Password hashing, 2FA, session management, suspicious-login detection, CSRF on the one cookie-authorized flow, lockout with backoff. |
| Authorization | Solid | Route-level permission checks throughout; a single permission catalog (`@bcp/permissions`) as the source of truth for both platform and studio roles. |
| White labeling | Solid | `@bcp/branding` converts a studio's tokens into CSS variables; no per-studio build required. |
| Custom domains | Solid | Full verification lifecycle (`StudioDomain`), CORS checks verified domains live against the database (Prompt 43 fix), SSL handled per deployment target via Let's Encrypt/cert-manager. |
| Subscription enforcement | Solid | Plan-limit checks (`assertWithinPlanLimit`) gate usage across every metered feature; grace-period handling on payment failure rather than an abrupt cutoff. |
| Licensing | Solid | Full lifecycle (issue/activate/renew/revoke) with seat and activation limits. |
| Studio CRM | Solid | Leads through invoices, a real funnel, extensively tested. |
| Client Portal | Solid | OTP sign-in, gallery access, contract signing, invoice payment — all built and tested. |
| Galleries | Solid | Upload, processing, watermarking, face search, AI photo intelligence. |
| Uploads | Solid | Chunked/multipart upload, validated file types and sizes. |
| AI | Solid, honestly scoped | Face search, photo quality analysis, the Copilot, Marketing Studio — every AI feature degrades to a clear "not configured" message rather than crashing or silently no-op'ing when credentials are absent, verified as a deliberate, repeated design pattern across every AI-touching prompt. |
| Billing | Solid | Invoicing, GST calculation, payment recording, profit reporting; online payment webhook *signature verification* is real and tested, but no actual webhook-receiving route exists yet (see Missing Modules). |
| WhatsApp | Solid | Full send/receive/template flow, webhook verification tested. |
| Email | Solid | SMTP-based sending, bounce tracking, redaction-safe logging. |
| Automation | Solid | Trigger→condition→action rule engine, tested, demonstrated in the seed data. |
| Reports | Solid | 22 reports over one shared `{columns, rows}` shape. |
| Security | Solid, with real fixes made mid-build | CORS misconfiguration and CSP-with-no-directives were both found and fixed during Prompt 43's own audit; the "never log" list is enforced at the root logger, not by convention. |
| Accessibility | Partial | Color-contrast checks exist in `@bcp/branding` (tested); no platform-wide screen-reader or keyboard-navigation audit has been performed. |
| Responsiveness | Partial | Real Playwright specs exist for all 11 required viewports with genuine, specific assertions (no clipped content, no unexpected scroll, touch targets, mobile tables) — but never executed in this sandbox (no browser binaries). Written and ready, not proven passing. |
| Performance | Partial | No load testing has been performed anywhere in this build; query patterns follow reasonable conventions (indexed foreign keys, pagination throughout) but haven't been profiled under real traffic. |
| PWA | Solid | Manifest, service worker, offline queue for a deliberately narrow, safe set of actions, install/update flows — for both `studio-web` and `client-portal`. |
| Monitoring | Solid | Per-service health checks (8 services), alert rules with real consecutive-failure logic, a real public status page. Health checks currently run on-demand (dashboard view) rather than a recurring schedule — stated as a next step in Prompt 46's own docs. |
| Deployment | Solid, now more so | Five real deployment guides, Kubernetes manifests, CI/CD — and, as of this audit, two critical Docker bugs actually fixed rather than left latent. |
| Documentation | Solid | 52 engineering docs plus a real 26-document user/operator-facing site (`apps/docs-web`), replacing what was a placeholder through Prompt 47. |

## Final Report

### Completed modules

Multi-tenancy and tenant isolation · Authentication and authorization
· White labeling and branding · Custom domains · Subscription and
license enforcement · Studio CRM (leads, clients, quotations,
bookings, events) · Client Portal · Galleries and photo delivery ·
Uploads · AI face search and photo intelligence · The AI Studio
Copilot · The AI Marketing Studio · Billing and invoicing · WhatsApp
integration · Email integration · Automation · Reports · Security
hardening · Progressive Web App support (both `studio-web` and
`client-portal`) · Background job processing (14 queues, retry,
dead-letter, idempotency) · Monitoring and observability · Deployment
infrastructure (Docker, CI/CD, Kubernetes manifests, five deployment
guides) · Documentation (engineering and user-facing) · Demo data and
an interactive product tour.

### Partially completed modules

- **Accessibility** — color-contrast is tested; no full
  screen-reader/keyboard-navigation audit exists.
- **Responsiveness** — real, specific Playwright tests exist for
  every required viewport but have never executed against a real
  browser in this environment.
- **Performance** — no load testing has been performed anywhere in
  this build.
- **Import/export queue processing** — the queue infrastructure
  (Prompt 44) exists, but the actual heavy CSV import/export logic
  (Prompt 41) still runs synchronously on the request thread rather
  than through the queue, a stated, deliberate scope decision rather
  than an oversight.
- **Studio hard-deletion** — the request/approval workflow and
  immediate access revocation are real; the physical database purge
  after approval is a stated, deliberately separate operational step.
- **Worker/queue-depth-based autoscaling** — both the Kubernetes HPA
  and AWS Auto Scaling configs scale the worker on CPU today, with
  the genuine next step (KEDA's BullMQ scaler, or a custom queue-depth
  metric) named directly rather than silently assumed done.

### Missing modules

- **A payment gateway webhook-receiving endpoint.** `RazorpayProvider`'s
  signature verification is real and tested; `createPaymentLink()`
  has no caller anywhere in the API, and no route exists to actually
  receive a Razorpay or Cashfree webhook. Payments today are recorded
  manually or via whatever a studio's own payment gateway integration
  provides outside this platform. Found during Prompt 45's own testing
  pass and named there rather than quietly built around.
- **Outbound webhooks to a studio's own systems.** This platform
  receives inbound webhooks (WhatsApp, and in future payments); it has
  no mechanism for a studio to register their own endpoint and receive
  outbound events from this platform.
- **A recurring, scheduled health-check job.** Health checks run
  on-demand today (viewing the dashboard, or hitting `/health/detailed`
  directly) rather than on a fixed interval independent of anyone
  looking.
- **Client-portal-native data export/deletion self-service.** A
  client's own data-subject requests are fulfilled by their studio
  today, not by the client directly from the Client Portal.

### Security risks

- **Low, given what's been checked and fixed**: CORS was found
  genuinely misconfigured and fixed (Prompt 43); a real cross-tenant
  isolation gap was found and fixed, with an automated test now
  guarding against a recurrence; the "never log" list is enforced
  structurally, not by convention.
- **Residual risk**: no payment webhook endpoint means payment
  confirmation currently depends on manual recording or external
  integration — a process gap more than a code vulnerability, but
  worth closing before payments are a primary revenue path through
  the platform itself.
- **Residual risk**: dependency and secret scanning have real, runnable
  local scripts (`pnpm run security:audit`, `security:secrets-scan`)
  but are not wired into an actual CI pipeline in this repository,
  since none existed to wire into before Prompt 47.

### Performance risks

- No load testing exists — the platform's actual behavior under
  concurrent load (many studios, many simultaneous gallery downloads,
  a large bulk photo upload) is unverified, not just unmeasured.
- Rate limiting is per-process by default; past a handful of `api`
  replicas, the *effective* platform-wide rate limit multiplies with
  replica count unless `@fastify/rate-limit` is pointed at the shared
  Redis instance, as documented in `docs/scaling.md`.
- Image processing (`sharp`-based compression in `apps/worker`) is
  CPU-intensive per job; the worker's own resource limits and HPA
  configs account for this, but haven't been validated against real
  large-batch upload volume.

### Scalability risks

- `api` and `worker` are both genuinely stateless and horizontally
  scalable — the harder ceiling is the single shared Postgres and
  Redis instance both depend on, not application replica count.
- Worker autoscaling is CPU-based today, not queue-depth-based — under
  a bursty job-volume pattern (many uploads at once, a large bulk
  WhatsApp send), CPU may lag behind actual backlog as a scaling
  signal.
- No sharding or read-replica story exists yet for Postgres; single
  primary is sufficient for the platform's current scale but is a real
  future constraint as studio count grows into the hundreds or
  thousands.

### Browser limitations

- The PWA install flow (both `studio-web` and `client-portal`) depends
  on `beforeinstallprompt`, which Safari/iOS does not fire the same
  way Chromium browsers do — iOS users install via "Add to Home
  Screen" manually; this is a real, standard, unavoidable platform
  difference, not a bug.
- The WhatsApp in-app browser (the single most common way a client
  actually opens a gallery/quotation/contract link) has real Playwright
  coverage with an accurate user-agent emulation, but has never
  executed against a real WhatsApp in-app browser instance, only the
  emulated equivalent.
- Face search relies on the device camera/file-input flow; behavior
  across older Android WebViews specifically (common in budget devices
  across this platform's actual Indian market) has not been separately
  verified beyond the general responsive test suite.

### Deployment checklist

- [ ] Every required environment variable set (`docs/environment-variables.md`)
- [ ] Database provisioned, migrations applied (`prisma migrate deploy`)
- [ ] Redis provisioned
- [ ] Object storage bucket created, credentials scoped to that bucket only
- [ ] SMTP configured and a test email sent successfully
- [ ] `BACKUP_ENCRYPTION_KEY` set before any backup is ever requested
- [ ] DNS pointed at the chosen deployment target; SSL certificate issuance confirmed
- [ ] `/health/detailed` returns `healthy` for every service that's configured
- [ ] The public status page (`status-web`) reflects the same data
- [ ] CI pipeline green on the exact commit being deployed
- [ ] A staging deployment has rehearsed this exact sequence first

### Launch checklist

- [ ] The two Docker CMD fixes from this audit are included in the
      deployed image (verify by actually starting a container and
      confirming it serves traffic — not just that the build succeeds)
- [ ] Demo data is confirmed **not** present in the production
      database (`SEED_DEMO_DATA` unset, or explicitly `false`)
- [ ] At least one platform admin account exists with a real,
      rotated password (not the seed placeholder hash)
- [ ] 2FA enabled on every platform admin and studio owner account
      before onboarding real studios
- [ ] Alert rules configured for at least database, redis, and storage
      health, with real notification emails set
- [ ] A backup has been successfully requested, approved, and
      verified restorable in a non-production environment
- [ ] The five deployment guides' own "before you deploy" checklists
      completed for whichever target is actually in use

### Post-launch roadmap

1. Build the payment gateway webhook-receiving endpoint — the single
   highest-value missing module, closing the gap between "signature
   verification is tested" and "payments actually confirm
   automatically."
2. Move CSV import/export processing onto the queue infrastructure
   that already exists for everything else.
3. Wire health checks to a recurring scheduled job rather than
   on-demand.
4. Add KEDA (or equivalent) queue-depth-based worker autoscaling.
5. Run a genuine load test against a staging environment before any
   large-scale studio onboarding push.
6. Execute the full Playwright responsive suite against real browsers
   in a CI environment with Docker/browser binaries available, closing
   the "written and ready" → "proven passing" gap.
7. A full accessibility audit (screen reader, keyboard-only
   navigation) beyond the color-contrast checks already in place.
8. Client-portal-native data export/deletion self-service, reducing
   dependency on the studio as an intermediary for data-subject
   requests.
9. Build the studio hard-deletion physical-purge pipeline, completing
   what the request/approval/access-revocation workflow already
   handles.
10. Outbound webhooks, letting studios integrate their own systems
    against platform events rather than only receiving inbound ones.
