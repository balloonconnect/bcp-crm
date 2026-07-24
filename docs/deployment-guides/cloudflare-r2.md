# Deployment Guide: Cloudflare + R2

Cloudflare Pages for every Next.js app, R2 for object storage (no
egress fees at all — the single biggest cost difference from S3 for a
photography platform where gallery downloads are the dominant traffic
pattern), and any container host of your choice for `api`/`worker`
(this guide assumes Railway or Fly.io for those two, since Cloudflare
itself doesn't run long-lived stateful containers the way `api` needs).

## 1. R2 for object storage

Create an R2 bucket (`bcp-studio-os-prod`). R2 is S3-API-compatible, so
`@bcp/storage`'s `StorageClient` needs no code changes — only config:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_BUCKET=bcp-studio-os-prod
S3_FORCE_PATH_STYLE=true
```

Generate the R2 API token from the Cloudflare dashboard, scoped to
**this bucket only** — not account-wide.

## 2. CDN — R2 is already behind Cloudflare's own CDN

No separate CDN setup step: R2 objects are served through Cloudflare's
own edge network the moment you attach a **custom domain** to the
bucket (R2 → bucket → Settings → Custom Domains), which also means
gallery photo delivery gets Cloudflare's caching and DDoS protection
for free, without a CloudFront-equivalent to configure separately.

## 3. `api` and `worker` — a container host

R2 doesn't host long-lived processes, so `api`/`worker` need a
separate target. **Railway** is the simplest pairing (see
[vercel-railway.md](vercel-railway.md)'s steps 1–3 for the exact setup
— just swap that guide's S3 configuration for R2's, above, and skip
its Vercel section since Cloudflare Pages replaces it here). **Fly.io**
is a reasonable alternative if you want the containers closer to
Cloudflare's own edge network geographically.

## 4. Cloudflare Pages for the web apps

For each of the 7 Next.js apps, create a Cloudflare Pages project:

- **Build command**: `cd ../.. && pnpm turbo run build --filter=@bcp/<app-name>`
- **Build output directory**: `apps/<app-name>/.next`
- **Root directory**: `/` (Pages needs the monorepo root to resolve
  workspace packages, unlike Vercel's per-app root directory option)

Cloudflare Pages' Next.js support runs via `@cloudflare/next-on-pages`
— add it as a build step if any app needs edge-runtime-specific
Next.js features; the static/ISR-heavy apps (`marketing-web`,
`docs-web`, `status-web`) work with plain Next.js output too.

## 5. DNS and SSL

Cloudflare is both the DNS provider and the CDN here — point your
domain's nameservers at Cloudflare, add each app as a Pages custom
domain, and Cloudflare issues and renews SSL automatically (Universal
SSL, free, no manual step). Set `api`'s domain as a CNAME to your
Railway/Fly.io-provided hostname, proxied (orange-clouded) through
Cloudflare for the same DDoS protection every other domain gets.

## 6. Domain verification for studio custom domains

Identical application-level flow (`StudioDomain`) as every other
guide. Once verified, add the domain as a custom domain on the
relevant Cloudflare Pages project.

## 7. Database migrations, queue setup, monitoring, backup recovery

Identical to whichever container host you chose in step 3 — see
[vercel-railway.md](vercel-railway.md) steps 7–10 (Railway) or the
equivalent Fly.io deploy-hook mechanism. This guide's only genuine
difference from the others is storage (R2) and the web-app host
(Cloudflare Pages instead of Vercel); everything downstream of
`api`/`worker` — migrations, queues, health monitoring, backup
recovery — works identically regardless of which container host or
web-app CDN sits in front of it.

## Why R2 specifically for this platform

A photography studio platform's dominant storage-cost driver is
egress — clients and studios downloading full-resolution galleries,
albums, and exports repeatedly. R2's zero-egress-fee model is a real,
substantial cost difference here versus S3/GCS, not a marginal one —
worth the slightly more manual container-hosting setup this guide
requires compared to an all-in-one platform like Railway alone.
