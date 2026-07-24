# Worker and API Scaling

Why `api` and `worker` scale independently, what actually drives each
one's load, and how to scale both on every supported target.

## Why they're separate scaling decisions

`api` handles synchronous HTTP request/response — its load correlates
with concurrent users actively using the app right now. `worker`
consumes background jobs (Prompt 44's 14 queues: email, WhatsApp,
image processing, AI analysis, PDF generation, and so on) — its load
correlates with *what those users just did* (uploaded a gallery,
triggered a bulk WhatsApp send, requested an export), which spikes
and settles on its own schedule, disconnected from concurrent-request
volume. Scaling them together — one replica count for both — means
either over-provisioning `api` to cover `worker`'s occasional spikes,
or starving `worker` during a genuine request-volume spike. This
platform's own Kubernetes manifests
([`k8s/api-deployment.yaml`](../k8s/api-deployment.yaml),
[`k8s/worker-deployment.yaml`](../k8s/worker-deployment.yaml)) already
encode this as two separate Deployments with two separate HPAs for
exactly this reason.

## Horizontal API scaling

`api` is genuinely stateless — authorization is Bearer-token-based
(see [docs/security-guide.md](security-guide.md)), no in-memory
session state, so any replica can serve any request with no sticky-
session requirement at the load balancer. This means horizontal
scaling is the *simple* case here: add replicas, and a standard
round-robin or least-connections load balancer distributes correctly
with zero additional coordination.

- **Kubernetes**: the HPA in `api-deployment.yaml` already does this —
  2 to 10 replicas on 70% CPU utilization.
- **Railway/Fly.io**: both support horizontal scaling natively from
  their own dashboards — set a replica count or an autoscaling rule
  directly.
- **AWS ECS**: an Application Auto Scaling policy on the ECS service,
  same CPU-utilization-target shape as the Kubernetes HPA.

The one thing that *does* need coordination across replicas: rate
limiting. `@fastify/rate-limit`'s in-memory store is per-process by
default — with multiple `api` replicas, each replica enforces its own
limit independently, meaning the *effective* platform-wide rate limit
is (configured limit) × (replica count). For a small replica count
this is a reasonable, known trade-off; past a handful of replicas,
point `@fastify/rate-limit` at the same Redis instance `worker`
already uses (a `redis` option it supports natively) so every replica
shares one counter.

## Worker scaling

Less straightforward, because BullMQ workers pull from a shared queue
rather than each handling an independent slice of load — adding
`worker` replicas increases total job-processing throughput, but
*which* metric should drive that scaling decision is genuinely queue
depth, not CPU (a queue backing up with hundreds of pending jobs while
every existing worker sits at 20% CPU is a real, common shape of
problem CPU-based scaling misses entirely).

- **Today, honestly**: every scaling config in this build (Kubernetes
  HPA, ECS policy) scales `worker` on CPU as a real, working starting
  point — stated directly as a starting point, not the ideal end
  state.
- **The genuine next step**: [KEDA's BullMQ
  scaler](https://keda.sh/docs/latest/scalers/redis-lists/) (on
  Kubernetes) or a custom CloudWatch metric published from
  `JobRecord`'s own queued-job count (on ECS) — both let the
  autoscaler read actual queue depth per queue name, so `email`
  backing up doesn't wait for CPU to climb before more capacity comes
  online.
- **Per-queue tuning**: not every queue needs the same worker
  concurrency. `apps/worker`'s `Worker` instances (one per queue, see
  `apps/worker/src/jobs/*.worker.ts`) each accept their own
  `concurrency` option — a CPU-heavy queue like `image-processing`
  (real `sharp` compression work) should run a lower concurrency per
  replica than a mostly-I/O-bound queue like `email` or `webhooks`,
  independent of how many `worker` replicas exist.

## Database and Redis — the actual ceiling

Both `api` and `worker` share one Postgres and one Redis — scaling
either compute layer past what the database/cache can handle just
moves the bottleneck, it doesn't remove it. Watch connection pool
saturation (Prisma's own connection pool, sized per `api`/`worker`
replica — more replicas means more total connections against the same
Postgres `max_connections`) and Redis memory/ops-per-second as the
real signals for when the database tier itself, not application
replica count, needs to scale (read replicas, a larger RDS/ElastiCache
instance class, or connection pooling via PgBouncer in front of
Postgres for a high-replica-count deployment).
