# @bcp/queue

Pure logic for background job queues: the 14-queue registry (each
tagged with its own retry ceiling and base backoff), exponential
backoff math, retry/dead-letter decisions, an idempotency-key builder,
and a job-status state machine. No BullMQ or Redis dependency — that
lives in `apps/worker` (the 14 consumers) and `apps/api`'s
`lib/job-queues.ts` (the producer side), both reading from this same
registry so they can never drift on a queue's name or retry policy.

## What's here

```
src/
  registry.ts             QUEUE_DEFINITIONS — all 14 named in the
                         brief, each with maxAttempts/baseBackoffMs
                         reflecting how safe that queue's work is to
                         retry aggressively
  retry-policy.ts             computeBackoffMs() (exponential,
                         capped at 10 min), shouldRetry()/
                         shouldMoveToDeadLetter()
  idempotency.ts                   buildIdempotencyKey() — a stable
                         key from a job's own natural identity
  job-status.ts                        canTransitionJobStatus(),
                         canCancelJob() — the state machine every
                         status change is checked against
  validation.ts                            enqueueJobSchema,
                         jobStatusFilterSchema
  index.ts                                    barrel export
```

See [docs/worker-and-job-queues.md](../../docs/worker-and-job-queues.md)
for the full design — including a real bug this pass found and fixed
in the pre-existing job-retry endpoint, and which queues do genuinely
real work versus honestly-scoped queue plumbing.

## Testing

```bash
pnpm --filter @bcp/queue test
pnpm --filter @bcp/queue typecheck
pnpm --filter @bcp/queue lint
```
