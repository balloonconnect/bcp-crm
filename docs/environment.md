# Environment Configuration

All environment variables are validated at boot via `@bcp/config`'s `getEnv()` (zod schema in `packages/config/src/env.ts`). If a required variable is missing or malformed, the process fails fast with a readable list of issues rather than failing deep inside a request handler.

## Where `.env` files live

- **Root `.env`** — used by `docker-compose.yml` for infra service credentials, and as the source you copy from.
- **`apps/api/.env`**, **`apps/worker/.env`** — server-side services that read the full schema.
- **`packages/database/.env`** — `DATABASE_URL` / `DIRECT_URL` for Prisma CLI commands (`generate`, `migrate`, `studio`) run directly against `packages/database`.
- **Each Next.js app's `.env`** — only needs `NODE_ENV` and `APP_URL` at this phase; server actions/route handlers added later will pull additional secrets as needed.

Never commit real `.env` files — only `.env.example` files are tracked.

## Variable reference

| Variable | Used by | Description |
|---|---|---|
| `NODE_ENV` | all | `development` \| `test` \| `production` |
| `APP_URL` | web apps | Public base URL of the app |
| `DATABASE_URL` | api, worker, database | Postgres connection string (pooled) |
| `DIRECT_URL` | database | Direct (non-pooled) Postgres connection, used by Prisma Migrate |
| `REDIS_URL` | api, worker | Redis connection string (cache + BullMQ) |
| `S3_ENDPOINT` | api, worker | MinIO/S3 endpoint |
| `S3_REGION` | api, worker | Defaults to `us-east-1` for MinIO |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | api, worker | Object storage credentials |
| `S3_BUCKET` | api, worker | Bucket name |
| `S3_FORCE_PATH_STYLE` | api, worker | `true` for MinIO, `false` for AWS S3 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | api, worker | Mailpit locally; real SMTP/provider in prod |
| `EMAIL_FROM` | api, worker | Default "From" address |
| `AUTH_SECRET` | api | HMAC signing secret for JWTs — generate with `openssl rand -base64 32` |
| `AUTH_URL` | api | Base URL used in auth callbacks/cookies |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | api | Token lifetimes (e.g. `15m`, `30d`) |
| `WHATSAPP_API_URL` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_VERIFY_TOKEN` | api, worker | WhatsApp Business Cloud API — optional until that feature phase |
| `ANTHROPIC_API_KEY` | api, worker | Claude API key — optional until AI features are built |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | api | Payments — optional until billing phase |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | api | Alternate payment provider — optional |
| `LICENSE_SIGNING_PRIVATE_KEY` / `LICENSE_SIGNING_PUBLIC_KEY` | api | Signs/verifies license keys issued by platform-admin |
| `LOG_LEVEL` | all server apps | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |
| `SENTRY_DSN` | all | Optional error tracking |

## Generating secrets

```bash
openssl rand -base64 32   # AUTH_SECRET
```

## Per-environment notes

- **Local** — values in `.env.example` match `docker-compose.yml` exactly; copy and go.
- **CI** — set only the variables required by the `test` and `build` Turborepo tasks (mainly `DATABASE_URL` pointing at a CI Postgres service and dummy values for the rest, since `getEnv()` requires presence but not real functionality for most fields).
- **Production** — inject via your hosting platform's secret manager; never bake secrets into Docker images.
