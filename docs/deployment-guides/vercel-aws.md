# Deployment Guide: Vercel + AWS

For teams that want the Next.js apps on Vercel but need AWS's own
managed services (RDS, ElastiCache, ECS, S3) for `api`/`worker` and
data — more operational control and AWS-native compliance/audit
tooling than Railway offers, at the cost of more setup.

## 1. RDS PostgreSQL

Provision an RDS PostgreSQL 16 instance (Multi-AZ for production —
automatic failover matters for a platform this many studios depend
on). Note the connection string as `DATABASE_URL`. Enable **automated
backups** in RDS's own console (a retention window of at least 7 days,
14+ recommended) — this is the infrastructure-level "Automated
backups" requirement, independent of this platform's own
application-level encrypted studio backups (Prompt 41).

## 2. ElastiCache Redis

Provision an ElastiCache Redis cluster (a single `cache.t4g.small`
node is enough to start; BullMQ's own throughput needs, not raw
Redis memory, will tell you when to scale up). Note the endpoint as
`REDIS_URL`.

## 3. S3 for object storage

Create an S3 bucket (`bcp-studio-os-prod`). `@bcp/storage`'s
`StorageClient` talks to S3 natively — no path-style/endpoint override
needed here (leave `S3_FORCE_PATH_STYLE=false`, use
`S3_ENDPOINT=https://s3.<region>.amazonaws.com`). Attach an IAM policy
scoped to only this bucket (`s3:GetObject`, `s3:PutObject`,
`s3:DeleteObject`, `s3:ListBucket`) to the credentials `api`/`worker`
use — never a broader account-wide policy.

## 4. CDN — CloudFront in front of S3

Create a CloudFront distribution with the S3 bucket as its origin,
using Origin Access Control (never a public bucket). Gallery photo
delivery, PDF exports, and backup downloads all go through
`StorageClient.getSignedGetUrl()` — CloudFront signed URLs are a drop-in
upgrade path here (swap the presigner) if S3's own signed URLs aren't
fast enough at your traffic; not required to launch.

## 5. ECS Fargate for `api` and `worker`

Push both Docker images (`apps/api/Dockerfile`, `apps/worker/Dockerfile`)
to ECR. Create two ECS Fargate services, one per image:

- `api`: expose port 4000 behind an **Application Load Balancer**,
  health check path `/health/ready`.
- `worker`: no load balancer target — it only consumes queues.

"Horizontal API scaling": set the `api` service's desired count to 2+
and attach an Application Auto Scaling policy on CPU utilization
(target ~70%, matching the Kubernetes HPA in
[k8s/api-deployment.yaml](../../k8s/api-deployment.yaml) for the same
reasoning). "Worker scaling": the same pattern on the `worker` service,
independently — job load and API request load don't correlate.

## 6. Secrets — AWS Secrets Manager

Store every credential (`DATABASE_URL`, `REDIS_URL`, `S3_SECRET_ACCESS_KEY`,
`ANTHROPIC_API_KEY`, `BACKUP_ENCRYPTION_KEY`, etc.) in Secrets Manager,
referenced by ECS task definitions via `secrets:` (never plain
`environment:` for anything sensitive). See
[docs/secret-management.md](../secret-management.md).

## 7. DNS and SSL

Route 53 for DNS. ACM for the ALB's certificate (`api.example.com`) —
free, auto-renewing, validated via a DNS `CNAME` record ACM provides.
Point the web apps' domains at Vercel as in the Railway guide; only
`api`'s domain needs to point at AWS.

## 8. Domain verification for studio custom domains

Identical to the Railway guide's step 6 — the verification flow is
entirely application-level (`StudioDomain`), not tied to any hosting
provider. Add the verified domain to the Vercel project serving
whichever app it routes to.

## 9. Database migrations

Run `prisma migrate deploy` as an ECS one-off task (a task definition
using the same `api` image with the command overridden) triggered by
your CI/CD pipeline's `migrate` job (`.github/workflows/deploy.yml`)
*before* updating the `api`/`worker` services to the new image tag.
See [docs/database-migrations-and-rollback.md](../database-migrations-and-rollback.md).

## 10. Monitoring

CloudWatch Container Insights for ECS-level CPU/memory/restart
metrics; point an external uptime monitor at `/health/detailed` and
`/status/public` exactly as in the Railway guide — this platform's own
health/status system (Prompt 46) is hosting-provider-agnostic by
design.

## 11. Backup recovery

RDS's own automated backups (step 1) restore to a new instance via
point-in-time recovery from the RDS console — practice this in a
non-production account before you need it for real. For the
platform's own application-level studio backups, see
[docs/backup-recovery-checklist.md](../backup-recovery-checklist.md).
