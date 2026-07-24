# Storage Setup

Where every photo, PDF, and export actually lives.

## Choosing a provider

Any S3-compatible object storage works — Amazon S3, Cloudflare R2
(no egress fees, a real cost advantage for a photo-heavy platform),
or Backblaze B2 are all supported identically.

## Steps

1. **Create a bucket** with your chosen provider.
2. **Create access credentials** scoped to only this bucket — never a
   broader, account-wide key.
3. **Set the following** in your environment configuration:
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET`
   - `S3_FORCE_PATH_STYLE` — `true` for most S3-compatible providers
     (including R2 and MinIO), `false` for Amazon S3 itself.

[Screenshot: Bucket creation screen showing region and access settings]

## Access control

Photos and exports are never publicly listable — every download goes
through a time-limited signed link generated on demand, so nothing is
reachable by guessing or scanning a URL.

## A CDN in front of storage

For faster gallery loading at scale, put a CDN in front of your
bucket — Cloudflare's own edge network in front of R2, or CloudFront
in front of S3. This isn't required to get started, only to reduce
load times for a large, geographically spread client base.

## Local development

Local development uses MinIO automatically (already running via
`docker compose up`) — no cloud account needed until you deploy.
