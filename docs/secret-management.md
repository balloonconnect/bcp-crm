# Secret Management

Every secret this platform uses, where it comes from, what happens
when it's missing, and how to handle it safely across the 5 supported
deployment targets.

## The core principle: missing is safe, wrong is not

Every optional integration in this codebase (AI, WhatsApp, payments,
push notifications, backups) checks whether its own credentials are
configured and degrades to a clear, honest "not configured" response
when they're not — never a silent no-op, never a crash. This means a
missing secret is always a visible, debuggable gap; a **wrong** or
**leaked** secret is the actual danger this document is about
preventing.

## Full variable reference

See `packages/config/src/env.ts` for the authoritative, always-current
list (this document explains categories and handling; that file is
the source of truth for exact names). The categories:

| Category | Variables | Required? |
|---|---|---|
| Database | `DATABASE_URL` | Yes |
| Redis | `REDIS_URL` | Yes |
| Object storage | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | Yes |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Yes |
| Auth | `JWT_SIGNING_KEY` | Yes |
| App identity | `APP_URL`, `CORS_ALLOWED_ORIGINS` | Yes |
| AI | `ANTHROPIC_API_KEY` | Optional — AI features degrade honestly without it |
| WhatsApp | `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | Optional |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Optional |
| Push notifications | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Optional |
| Backup encryption | `BACKUP_ENCRYPTION_KEY` | Required only to use the encrypted-backup feature (Prompt 41) |
| CSRF | `CSRF_SECRET` | Optional — falls back to a per-process random secret, never a predictable default |

## Never in this repository

- No `.env` file with real values is ever committed — every app ships
  a `.env.example` with placeholder values and a real `.gitignore`
  entry for `.env`.
- No secret is ever baked into a Docker image layer — every
  `Dockerfile` in this repo reads configuration from the environment
  at container start, never `ARG`/`ENV` with a real value hardcoded at
  build time.
- No secret appears in a log line — see
  [docs/monitoring-and-observability.md](monitoring-and-observability.md)'s
  "never log" section; this is enforced at the root logger, not left
  to convention.

## Per-target secret storage

- **Vercel**: Project → Settings → Environment Variables, scoped
  per-environment (Preview/Production) — Vercel encrypts these at
  rest and injects them at build/runtime only.
- **Railway**: Project → Variables, with the "Reference variable"
  feature for sharing a value (like `DATABASE_URL`) across services
  without re-entering it.
- **AWS**: Secrets Manager, referenced by ECS task definitions'
  `secrets:` field (resolved at container start, never baked into the
  task definition itself in plaintext) — see
  [deployment-guides/vercel-aws.md](deployment-guides/vercel-aws.md).
- **Cloudflare**: Pages' own encrypted environment variables for the
  web apps; whichever container host you paired with R2 (Railway or
  Fly.io) for `api`/`worker`'s secrets.
- **Kubernetes**: a `Secret` resource (`k8s/secret.example.yaml` is the
  template — never commit the filled-in version). For anything beyond
  a single-cluster setup, use an external-secrets operator pulling
  from a real secret manager (AWS Secrets Manager, GCP Secret Manager,
  HashiCorp Vault) rather than `kubectl apply`-ing secrets by hand
  repeatedly.

## Rotation

Rotating a secret (a leaked key, a routine schedule, an offboarded
team member who had access) follows the same shape everywhere: update
the value in the platform's own secret store, redeploy (or, on
Kubernetes, `kubectl rollout restart` to pick up the new Secret without
a full redeploy), then verify via `/health/detailed` that the
affected service (whichever one used that credential) reports healthy
again. `BACKUP_ENCRYPTION_KEY` is the one secret that's **never**
safe to rotate without a plan — an existing encrypted backup can only
ever be decrypted with the key it was encrypted under; rotating this
key means keeping the old key retrievable (even if no longer used for
new backups) for as long as any backup encrypted under it might still
need restoring. See
[docs/incident-response-guide.md](incident-response-guide.md) for the
"rotate any credential that might be involved" step in an actual
security incident.
