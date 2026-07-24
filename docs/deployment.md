# Deployment Overview

This is the index — start here, then follow the link for whatever
you're actually trying to do. Everything this document originally
deferred ("later phase," written before any business feature existed
to deploy) is now real: CI/CD, Kubernetes manifests, and five complete
deployment guides.

## Deployment units

Each app/service builds and deploys independently — a change to
`studio-web` doesn't require redeploying `api` or `marketing-web`.

| Unit | Suggested target | Why |
|---|---|---|
| `marketing-web`, `docs-web`, `status-web` | Vercel / Cloudflare Pages | Mostly static/ISR content, benefits from edge CDN |
| `platform-admin`, `studio-web`, `client-portal`, `gallery-web` | Vercel / Cloudflare Pages | Dynamic, tenant-aware apps behind auth, still stateless |
| `api` | Container platform (Railway, ECS, Kubernetes) | Long-lived Fastify process, needs Postgres/Redis network access |
| `worker` | Container platform, scaled independently from `api` | CPU/IO-bound background jobs — see [docs/scaling.md](scaling.md) for why it scales separately |
| `packages/*` | Not deployed directly | Consumed via workspace linking at build time by the apps above |

Every containerized app ships its own `Dockerfile` (`apps/*/Dockerfile`)
using a multi-stage build: install workspace deps → `turbo build
--filter=<app>...` → copy only the built output + `node_modules` into
a slim runner image.

## Pick your deployment target

| Guide | Best for |
|---|---|
| [Vercel + Railway](deployment-guides/vercel-railway.md) | Lowest friction, fastest to a real production deployment |
| [Vercel + AWS](deployment-guides/vercel-aws.md) | Teams needing AWS-native compliance/audit tooling |
| [Full Docker VPS](deployment-guides/docker-vps.md) | Full control, no managed-service lock-in, single-region |
| [Cloudflare + R2](deployment-guides/cloudflare-r2.md) | Zero storage-egress-fee cost model — real savings for gallery-download-heavy traffic |
| [Kubernetes-ready](deployment-guides/kubernetes.md) | Existing cluster infrastructure, data-residency requirements |

Every guide covers the same checklist — DNS, SSL, environment
variables, database migration, storage setup, queue setup, domain
verification, monitoring, backup recovery — in that target's own
specific terms.

## CI/CD

`.github/workflows/ci.yml` — PR checks (lint/typecheck/test/build)
scoped to only the packages actually affected by a change via
Turborepo's `--filter=[origin/main]`, plus a separate Docker-backed job
for the Testcontainers integration suite (Prompt 45).
`.github/workflows/deploy.yml` — builds and pushes every containerized
app's image, then gates database migration and service deployment
behind GitHub Environments (production requires manual approval).

## Environment topology

```
                        ┌────────────────────┐
                        │   Load balancer /   │
                        │   reverse proxy     │
                        └─────────┬───────────┘
        ┌───────────────┬─────────┼─────────┬───────────────┬───────────────┐
        │               │         │         │               │               │
  marketing-web   platform-admin  studio-web client-portal  gallery-web    docs-web / status-web
        │               │         │         │               │
        └───────────────┴─────────┼─────────┴───────────────┘
                                   │  REST calls
                              ┌────▼────┐
                              │   api   │──────────┐
                              └────┬────┘          │ jobs enqueued (Prompt 44)
                                   │                ▼
                         ┌─────────┴───────┐   ┌─────────┐
                         │   PostgreSQL    │   │  worker │
                         │   (primary DB)  │   └────┬────┘
                         └─────────────────┘        │
                              ┌──────────┐           │
                              │  Redis   │◄──────────┘
                              │ (cache + │
                              │  queues) │
                              └──────────┘
                              ┌──────────┐
                              │  Object  │  (S3/R2 in prod, MinIO locally)
                              │  storage │
                              └──────────┘
```

## Multi-tenancy at deploy time

Studios are rows in `Studio` (see `packages/database`), not separate
deployments — one deployment of each app serves every studio. Custom
domains (`StudioDomain`, Prompt 9) are resolved at request time by
`apps/api`'s `hostname-middleware.ts`, and CORS explicitly allows any
studio's own *verified* custom domain (Prompt 43) — no wildcard,
checked against the database on each request. `packages/branding`
converts a studio's brand tokens into CSS variables, so no app needs a
studio-specific build.

## Related docs

- [docs/database-migrations-and-rollback.md](database-migrations-and-rollback.md)
- [docs/secret-management.md](secret-management.md)
- [docs/scaling.md](scaling.md)
- [docs/environment.md](environment.md)
- [docs/monitoring-and-observability.md](monitoring-and-observability.md)
- [docs/backup-recovery-checklist.md](backup-recovery-checklist.md)
- [k8s/README.md](../k8s/README.md)
