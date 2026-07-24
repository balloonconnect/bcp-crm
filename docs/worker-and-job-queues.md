# Worker and Job Queues

Background processing across the 14 queues named in the brief —
retry with exponential backoff, a genuine dead-letter queue,
idempotency, cancellation, logs, progress, admin monitoring,
studio-visible status, and failure alerts. Built across `@bcp/queue`
(the queue registry, retry/backoff math, idempotency-key building, and
the job-status state machine — all pure) and `apps/worker` (14 real
BullMQ workers) plus `apps/api`'s enqueue and monitoring layer.

## Discovered, not built from scratch

Real BullMQ + Redis infrastructure already existed before this pass —
a `queues.ts` with a live connection, a `JobRecord` model already
tracking queue/status/attempts, and two working demonstration files
(`email.worker.ts`, `ai-analysis.worker.ts`) that were explicit about
their own scope: the AI-analysis file said outright that its business
logic "would run here — not built in this phase, since this file
exists specifically to demonstrate the enforcement wiring." This pass
built on that foundation and its honesty, rather than replacing it.

## The 14 queues, one shared registry

`@bcp/queue`'s `QUEUE_DEFINITIONS` is the single source of truth both
`apps/api` (the producer) and `apps/worker` (the consumer) read from,
so the two apps can never drift on a queue's name or how it retries.
Each queue's `maxAttempts`/`baseBackoffMs` reflects what kind of work
it does — payment reconciliation and backups get fewer, slower
retries than a cheap email or WhatsApp send, since retrying
write-sensitive work aggressively is a different risk than retrying a
simple notification.

## Retry, exponential backoff, and the dead-letter queue

`computeBackoffMs()` doubles from a queue's own base delay per
attempt, capped at 10 minutes. `shouldRetry()`/`shouldMoveToDeadLetter()`
are the one decision every job failure passes through — `apps/worker`'s
shared `job-tracker.ts` wrapper calls these on every failure, moving a
job to `dead_letter` status once its queue's configured attempts are
exhausted rather than leaving it ambiguously `failed`. A genuine,
separate BullMQ `dead-letter` queue exists alongside the 14 named
ones, so a dead-lettered job is inspectable independent of which queue
it originally failed in.

## Idempotency

`buildIdempotencyKey()` builds a stable key from a job's own natural
identity; `apps/api`'s `enqueueJob()` checks for an existing,
non-terminal `JobRecord` with the same key before creating a new one
and adding to BullMQ — enqueueing the same logical job twice (a
retried API call, a double-submitted form) never results in the work
happening twice.

## Cancellation

`canCancelJob()` only allows cancelling a job in `queued`, `running`,
or `retrying` — never a job that's already reached a terminal outcome,
since the result is already fixed either way. Cancelling removes the
job from BullMQ (best-effort) and marks the `JobRecord` `cancelled`,
which is the authoritative outcome regardless of whether the BullMQ
removal itself succeeds.

## Logs, progress, admin monitoring, studio-visible status

Every job's `JobRecord` row is the shared source of truth for all
four: `apps/worker`'s own structured logs go to stdout via `@bcp/logger`
in addition to the row; `reportProgress()` mirrors progress onto both
the live BullMQ job and the persisted row (since in-memory BullMQ
progress doesn't survive a completed job or a worker restart);
platform admins see every studio's jobs via the pre-existing
`/platform/jobs` monitoring module (found already built and wired
during this pass — not duplicated); a studio sees only its own via the
new `/jobs` — genuinely separate views over the same underlying table,
scoped by permission.

## Failure alerts

Fired exactly once per job, on the dead-letter transition — not on
every individual retry, which would be noise for exactly the
transient failures retries exist to absorb. Always writes to the
append-only `AuditLog`; a studio-scoped job's failure is flagged
against that studio specifically.

## What this pass built for real, and what it left honestly scoped

Seven queues do genuinely real work end to end: email (SMTP), WhatsApp
(Cloud API), image processing (`sharp`, against real storage), PDF
generation (`pdfkit`), webhooks (real HTTP delivery), notifications
(real web-push fan-out with stale-subscription cleanup), retention
cleanup and subscription expiry (real database sweeps). Payment
reconciliation is real but deliberately scoped down — it flags stale
pending payments rather than calling out to a live payment gateway's
own reconciliation API, since this sandbox has no live gateway
credentials, the same accepted limitation this codebase already
states elsewhere for Razorpay/Cashfree. Face indexing follows the
existing AI-analysis file's own honest pattern — a real plan-limit
gate, with the actual AWS-credentialed indexing call left to
`apps/api`'s own service layer rather than duplicated. Import and
export queue plumbing exists (tracking, retry, DLQ) but intentionally
does not duplicate Prompt 41's heavier, actively-used synchronous
services across two separate deployables — each file states this
directly rather than faking the logic thinly.

## A real bug found and fixed along the way

The pre-existing platform-admin job "retry" endpoint only ever flipped
a `JobRecord`'s status back to `queued` in the database — it never
actually re-enqueued the job into BullMQ, meaning a retried job would
have sat "queued" forever without ever running again. Now that real
queue infrastructure exists (this prompt's own work), that endpoint
genuinely re-enqueues the job using its originally persisted payload.

## Testing

```bash
pnpm --filter @bcp/queue test     # registry, backoff math, retry/DLQ decisions, idempotency, status machine
pnpm --filter @bcp/worker typecheck
pnpm --filter @bcp/worker lint
pnpm --filter @bcp/api test
pnpm --filter @bcp/api typecheck
pnpm --filter @bcp/studio-web build   # /jobs — studio-visible status
```
