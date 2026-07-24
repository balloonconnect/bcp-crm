# Local Setup Guide

## Prerequisites

- **Node.js** ≥ 20.11 (see `.nvmrc` — `nvm use`)
- **pnpm** ≥ 9 — enable via corepack: `corepack enable`
- **Docker** + **Docker Compose** (for Postgres, Redis, MinIO, Mailpit)
- Optional: a Postgres GUI (TablePlus, Postico) and Redis GUI if you don't want to use the CLI

## 1. Install dependencies

```bash
corepack enable
pnpm install
```

This installs dependencies for every app and package in one pass (pnpm workspaces + Turborepo handle hoisting and inter-package linking automatically via `workspace:*` protocol).

## 2. Configure environment variables

See [environment.md](./environment.md) for the full variable reference. Quick path:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp packages/database/.env.example packages/database/.env
# repeat for any app under apps/* you're actively running
```

The Docker Compose defaults in `.env.example` already match `docker-compose.yml`, so local dev works out of the box without editing values — you only need real credentials for WhatsApp/Anthropic/Razorpay/Stripe when you get to those features.

## 3. Start local infrastructure

```bash
docker compose up -d
```

This brings up:
- **postgres** on `5432`
- **redis** on `6379`
- **minio** on `9000` (API) / `9001` (console) — a `minio-init` sidecar auto-creates the dev bucket
- **mailpit** on `1025` (SMTP) / `8025` (web UI)

Check everything is healthy:

```bash
docker compose ps
```

## 4. Set up the database

```bash
pnpm db:generate     # generate the Prisma client
pnpm db:migrate       # run migrations against the local Postgres
```

Optional seed data:

```bash
pnpm --filter @bcp/database db:seed
```

Browse the database visually:

```bash
pnpm db:studio
```

## 5. Run the apps

Run everything in parallel (recommended for full-stack work):

```bash
pnpm dev
```

Or run a single app with Turborepo's filter flag:

```bash
pnpm turbo run dev --filter=@bcp/studio-web
pnpm turbo run dev --filter=@bcp/api
```

Then visit:
- Marketing site → http://localhost:3000
- Platform admin → http://localhost:3001
- Studio console → http://localhost:3002
- Client portal → http://localhost:3003
- Gallery → http://localhost:3004
- Docs → http://localhost:3005
- Status → http://localhost:3006
- API health check → http://localhost:4000/health
- Mailpit inbox (dev emails) → http://localhost:8025
- MinIO console (dev files) → http://localhost:9001

## 6. Git hooks

Husky is wired up via the root `prepare` script, so hooks install automatically after `pnpm install`. `lint-staged` runs ESLint + Prettier on staged files before each commit, and `commitlint` enforces Conventional Commits on commit messages.

## Troubleshooting

- **"Cannot find module '@bcp/…'"** — run `pnpm install` again at the repo root; workspace packages are symlinked, not published.
- **Prisma client not found** — run `pnpm db:generate` after any `prisma/schema.prisma` change.
- **Port already in use** — another process (or a previous `docker compose up`) is holding the port; stop it or override the port via the app's `.env`.
- **MinIO bucket missing** — re-run `docker compose up -d minio-init` to recreate it.
