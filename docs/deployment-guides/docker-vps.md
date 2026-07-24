# Deployment Guide: Full Docker VPS

Everything on one (or a small cluster of) VPS instances via Docker
Compose — the most self-contained option, no managed-service lock-in,
full control, and the most operational responsibility (you own
patching, backups, and scaling by hand). A good fit for a single-region
deployment where AWS/Vercel-level scale isn't needed yet.

## 1. Provision the VPS

A single 4 vCPU / 8GB RAM instance (Hetzner, DigitalOcean, Linode all
work) comfortably runs every service in this platform for a
mid-size studio base. Install Docker and the Compose plugin.

## 2. Clone and configure

```bash
git clone <this-repo> && cd bcp-studio-os
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
# fill in every variable — see docs/secret-management.md for what each one is
```

## 3. Run the full stack

This repo's `docker-compose.yml` (Postgres, Redis, MinIO, Mailpit) is
built for local development — for production, run the app-services
overlay against **your own** production Postgres/Redis rather than the
dev-credential containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml up -d --build
```

For a genuinely production-hardened setup, replace the `postgres` and
`redis` services in `docker-compose.yml` with a managed alternative
(even on a VPS-first deployment, a managed Postgres is worth it for the
automated-backup story alone — see step 8) or run Postgres/Redis on a
separate, more carefully backed-up instance from the stateless
`api`/`worker` containers.

## 4. Reverse proxy, SSL, and CDN

Run **Caddy** or **nginx + certbot** in front of every service —
Caddy is the simpler choice here (automatic Let's Encrypt, zero
manual certificate renewal):

```
api.example.com {
    reverse_proxy localhost:4000
}
app.example.com {
    reverse_proxy localhost:3002
}
# one block per app — see docker-compose.apps.yml for each app's port
```

For a real CDN in front of static/gallery assets on a VPS deployment,
put Cloudflare (free tier is enough to start) in front of the whole
domain in proxy mode — this also gives you DDoS protection a bare VPS
doesn't have on its own.

## 5. Object storage

MinIO (already in `docker-compose.yml`) works for production on a
single-VPS deployment, but has no built-in redundancy — for anything
beyond a small studio base, point `S3_ENDPOINT`/`S3_*` at a real
provider (Backblaze B2 is the cheapest S3-compatible option with no
egress fees to Cloudflare specifically, which pairs well with step 4).

## 6. Queue setup

Nothing beyond Redis already running in step 3 — `apps/worker`
connects and creates its 14 queues automatically.

## 7. Domain verification

Identical to the other guides — entirely application-level
(`StudioDomain`), independent of hosting. Once verified, add the
domain to your Caddy/nginx config as its own block pointing at
whichever app serves it.

## 8. Database migrations and automated backups

Run migrations manually or via a deploy script:

```bash
docker compose exec api pnpm --filter @bcp/database exec prisma migrate deploy
```

**"Automated backups"** on a bare VPS means you own this — set up a
cron job running `pg_dump` on a schedule, piped to your object storage
bucket, with a retention policy (e.g. 7 daily + 4 weekly). This is
infrastructure-level backup, independent of and in addition to this
platform's own application-level encrypted studio backups (Prompt 41):

```bash
0 2 * * * docker compose exec -T postgres pg_dump -U bcp bcp_studio_os | gzip | aws s3 cp - s3://your-backup-bucket/db-$(date +\%Y\%m\%d).sql.gz
```

## 9. Rollback

Keep the previous image tags around (`docker compose` doesn't prune
automatically) — a bad deploy rolls back with:

```bash
docker compose -f docker-compose.yml -f docker-compose.apps.yml up -d --no-build <service>=<previous-tag>
```

See [docs/database-migrations-and-rollback.md](../database-migrations-and-rollback.md)
for the harder case — rolling back a migration, not just an image.

## 10. Monitoring

Point an external uptime monitor at `/health/detailed` and
`/status/public` exactly as the other guides. For container-level
metrics on a VPS, `docker stats` covers the basics; for anything more,
run `cadvisor` + `prometheus` + `grafana` as additional Compose
services — a reasonable next step, not included by default here to
keep the base stack lean.

## 11. Backup recovery

Restoring the `pg_dump` from step 8:

```bash
gunzip -c db-20260101.sql.gz | docker compose exec -T postgres psql -U bcp bcp_studio_os
```

For the platform's own application-level studio backups, see
[docs/backup-recovery-checklist.md](../backup-recovery-checklist.md).
