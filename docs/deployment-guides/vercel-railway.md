# Deployment Guide: Vercel + Railway

The lowest-friction path to a real production deployment — Vercel for
every Next.js app (all 7 of them get edge CDN, automatic preview
deploys per PR, and zero server management for free), Railway for
`api`, `worker`, PostgreSQL, and Redis (all four as one project, one
bill, one dashboard).

## 1. Provision Railway infrastructure

1. Create a new Railway project.
2. Add a **PostgreSQL** plugin — Railway provisions it and exposes
   `DATABASE_URL` automatically.
3. Add a **Redis** plugin — exposes `REDIS_URL` automatically.
4. Add two services from this repo, each pointing at its own
   Dockerfile:
   - `api` → `apps/api/Dockerfile`, expose port `4000`.
   - `worker` → `apps/worker/Dockerfile`, no exposed port (consumes
     queues only).
5. Railway's own "Reference variable" feature lets `worker` and `api`
   both reference the same `DATABASE_URL`/`REDIS_URL` from the plugins
   above — set once, shared everywhere.

## 2. Object storage

Railway doesn't offer S3-compatible object storage directly — use a
real S3-compatible provider instead (AWS S3, Cloudflare R2, or
Backblaze B2 all work identically here, since `@bcp/storage`'s
`StorageClient` only needs an S3-compatible endpoint). Set on both
`api` and `worker`:

```
S3_ENDPOINT=https://s3.<region>.amazonaws.com
S3_REGION=<region>
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=bcp-studio-os-prod
S3_FORCE_PATH_STYLE=false
```

## 3. Environment variables

Set every variable from `packages/config/src/env.ts` on **both** `api`
and `worker` in Railway's dashboard (they share the same schema).
Minimum for a working deployment: `DATABASE_URL`, `REDIS_URL`,
`APP_URL`, `CORS_ALLOWED_ORIGINS` (the exact Vercel URLs from step 4,
comma-separated), `S3_*` (above), `SMTP_*` and `EMAIL_FROM`,
`JWT_SIGNING_KEY` (a real random secret — never the dev default),
`BACKUP_ENCRYPTION_KEY` (see
[docs/import-export-backup.md](../import-export-backup.md)). Everything
else (`ANTHROPIC_API_KEY`, `WHATSAPP_*`, `RAZORPAY_*`, `VAPID_*`) is
optional and enables its own feature only once set — see
[docs/secret-management.md](../secret-management.md).

## 4. Deploy the web apps to Vercel

For each of the 7 Next.js apps, create a separate Vercel project
pointed at this repo with:

- **Root Directory**: `apps/<app-name>`
- **Build Command**: `cd ../.. && pnpm turbo run build --filter=@bcp/<app-name>`
- **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

Set `NEXT_PUBLIC_API_URL` on every app to `api`'s Railway URL (or your
custom API domain, once step 6 is done).

## 5. DNS and SSL

Point each app's domain at Vercel (`CNAME` to `cname.vercel-dns.com`,
or use Vercel's nameservers) and `api`'s domain at Railway's provided
CNAME target. Both platforms provision and renew Let's Encrypt
certificates automatically the moment DNS resolves — no manual
certificate management on either platform.

## 6. Domain verification for studio custom domains

A studio's own custom gallery/e-album/portal domain (Prompt 9) is
verified by the studio adding a TXT record this platform's own
`StudioDomain` verification flow checks — nothing Railway/Vercel-
specific here; see
[docs/database-conventions.md](../database-conventions.md) for the
`StudioDomain.status` lifecycle. Once verified, add the domain to
**Vercel's** project (Vercel supports unlimited custom domains per
project on paid plans) — traffic for the studio's domain then resolves
through the same Next.js deployment already serving every other
studio, since tenancy is resolved by hostname at request time
(`apps/api`'s `hostname-middleware.ts`), not by a separate deployment
per studio.

## 7. Database migrations

Railway's own deploy hooks support a pre-deploy command — set `api`'s
to `pnpm --filter @bcp/database exec prisma migrate deploy`, so every
deploy applies pending migrations *before* the new `api` image starts
receiving traffic. See
[docs/database-migrations-and-rollback.md](../database-migrations-and-rollback.md).

## 8. Queue setup

Nothing beyond step 1's Redis plugin — `apps/worker`'s own `queues.ts`
(Prompt 44) connects to whatever `REDIS_URL` is set, and the 14 named
queues are created automatically the first time each is used. No
manual queue provisioning step exists or is needed.

## 9. Monitoring

Point an external uptime monitor (Better Uptime, UptimeRobot, or
similar) at `https://<api-domain>/health/detailed` — the real
per-service health endpoint from Prompt 46 — and at each web app's own
root URL. For the platform's own status page, deploy `status-web` the
same way as the other 6 Next.js apps; it reads
`https://<api-domain>/status/public`.

## 10. Backup recovery

Railway's PostgreSQL plugin includes automated daily backups with
point-in-time recovery on paid plans — this is infrastructure-level
backup, independent of and in addition to this platform's own
application-level encrypted studio backups (Prompt 41). Restoring
Railway's own backup is done from Railway's dashboard directly; for
restoring a studio's own encrypted application-level backup, see
[docs/backup-recovery-checklist.md](../backup-recovery-checklist.md).
