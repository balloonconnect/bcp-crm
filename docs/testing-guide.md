# Testing Guide

How this platform is actually tested — what runs where, what needs
Docker or a live browser, and where every category named in the brief
lives. Read this before assuming a gap; most of the checklist was
already covered by the ~730+ unit tests accumulated across every
prompt in this build before this pass even started.

## The testing pyramid this platform actually uses

1. **Unit tests (Vitest)** — the overwhelming majority of this
   platform's test coverage. Every `@bcp/*` package's pure business
   logic (pricing, validation, state machines, ranking, scheduling,
   retry policy — dozens of these) is unit-tested in isolation, no
   database or network required. Run with `pnpm test` from the repo
   root (via Turborepo, across every package).
2. **Mocked API-level tests (Vitest + `vi.mock`)** — `apps/api`'s own
   test suite, testing real route/service logic against a mocked
   `@bcp/database` module rather than a live one. Fast, no
   infrastructure, and — as this pass demonstrated with the WhatsApp
   webhook-verification tests — genuinely tests the real, shipped
   code path, not a reimplementation of it. Run with
   `pnpm --filter @bcp/api test`.
3. **Testcontainers integration tests (Vitest + real Postgres)** — for
   the specific things a mock can't faithfully stand in for: real SQL
   behavior, real constraint enforcement, real cross-tenant query
   rejection at the database layer. `@bcp/test-utils`'s
   `startTestDatabase()` spins up a genuine, ephemeral Postgres
   container, applies every migration this platform has accumulated,
   and hands back a real Prisma client. Run with
   `pnpm --filter @bcp/api test:integration` — **requires a Docker
   daemon**, deliberately kept out of the default `test` script so
   everyday development and any Docker-less CI runner aren't blocked
   by it.
4. **Playwright end-to-end and responsive tests** — `e2e/`, covering
   real browser behavior across the 11 viewport sizes named in the
   brief. **Requires downloaded browser binaries**
   (`pnpm --filter @bcp/e2e install-browsers`) **and a running dev
   server** (`BASE_URL` env var, default `http://localhost:3002`).

## What genuinely needed Docker or a browser, and wasn't run in this sandbox

This sandbox has never had a Docker daemon or downloadable browser
binaries available at any point across this entire build (the same
constraint that's meant `prisma generate` itself has never been
runnable here either — every apps/api and packages/database typecheck
in this project carries the same three-line "Cannot find module
'../generated/client'" notice for exactly this reason). Two things
follow from that, stated plainly rather than glossed over:

- `apps/api/src/__tests__/integration/tenant-isolation.integration.test.ts`
  is real, correct code — verified to *fail to even load* in this
  sandbox for exactly the expected reason (no `PrismaClient`, no
  Docker), and deliberately excluded from the default `test` script so
  that expected failure never blocks or fails the everyday test run.
  It's ready to run anywhere with Docker.
- Every file in `e2e/tests/` is real, correct Playwright code, checked
  with `tsc --noEmit` (which caught and let us fix a genuine bug: a
  project-configuration object-spread ordering mistake that would have
  silently made all 11 viewport projects share the same default
  viewport, defeating the entire point of the matrix) — but none of it
  has actually executed against a real browser or a running app in
  this build.

Neither of these is a hedge — they're real, reviewed, bug-fixed code
that just hasn't had the infrastructure available here to prove itself
by actually running. The honest status is "written and ready," not
"tested."

## Where each brief category actually lives

| Category | Where |
|---|---|
| Unit | Every `@bcp/*` package's own `src/__tests__/` |
| API integration | `apps/api/src/__tests__/` (mocked) |
| Database | `apps/api/src/__tests__/integration/` (Testcontainers) |
| Authentication | `@bcp/auth`'s `lockout.test.ts`, `csrf.test.ts`, `suspicious-login.test.ts` |
| Authorization | `@bcp/permissions`' own suite; route-level checks throughout `apps/api` |
| Tenant isolation | `@bcp/database`'s `tenant-scope.test.ts` + `tenant-scope-completeness.test.ts` (a schema-parsing regression test that already caught one real gap during Prompt 43) + the Testcontainers integration test |
| Subscription limits | `@bcp/billing`'s `limit-warnings.test.ts`, `plans.test.ts` |
| License enforcement | `@bcp/billing`'s `license-lifecycle.test.ts`, `activation-policy.test.ts` |
| Payment webhooks | `@bcp/payments`' `razorpay-webhook.test.ts` (new this pass — the package had zero tests before) |
| WhatsApp webhooks | `apps/api`'s `whatsapp-webhook.test.ts` (new this pass, and the first file in `apps/api` to establish the mocked-`@bcp/database` testing pattern) |
| Upload | `@bcp/upload`'s own suite |
| Gallery security | `@bcp/gallery`'s own suite |
| AI provider mocks | `@bcp/test-utils`'s `MockFaceRecognitionProvider`/`MockAiClient` |
| Client selection | `@bcp/selection`'s own suite |
| Invoice generation | `@bcp/invoicing`'s `numbering.test.ts`, `gst-discount.test.ts`, etc. |
| End-to-end | `e2e/tests/` (Playwright) |

## A real gap this pass found and did not build around

Looking for a payment-webhook *route* to test, this pass found there
isn't one — `RazorpayProvider.createPaymentLink()` has no caller
anywhere in `apps/api`, and no endpoint exists to actually receive a
Razorpay or Cashfree webhook. That's real feature work, not testing
work, so rather than build a new webhook pipeline under a "testing"
prompt, this pass tested the signature-verification logic that does
exist (and was previously entirely untested) and is naming the gap
here directly.

## Running everything

```bash
pnpm test                                          # every package's unit + mocked tests
pnpm --filter @bcp/api test:integration             # Testcontainers (needs Docker)
pnpm --filter @bcp/e2e install-browsers && pnpm test:e2e   # Playwright (needs browsers + a running dev server)
```
