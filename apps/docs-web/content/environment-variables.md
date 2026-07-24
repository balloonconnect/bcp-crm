# Environment Variables

Every configuration value the `api` and `worker` apps need, grouped
by what they're for. Missing an optional value never crashes the
platform — the specific feature it enables is simply unavailable
until it's set, with a clear message rather than a silent failure.

## Required for a working deployment

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (queues + cache) |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | Object storage — see [Storage Setup](/docs/storage-setup) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Outgoing email — see [Email Setup](/docs/email-setup) |
| `JWT_SIGNING_KEY` | Signs authentication tokens — a real random secret in production, never the local default |
| `APP_URL`, `CORS_ALLOWED_ORIGINS` | Your platform's own domains |

## Optional — each enables its own feature

| Variable | Enables |
|---|---|
| `ANTHROPIC_API_KEY` | AI features (Copilot, Marketing Studio, photo intelligence) |
| `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp messaging — see [WhatsApp Setup](/docs/whatsapp-setup) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payments — see [Payment Setup](/docs/payment-setup) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications for the installable app |
| `BACKUP_ENCRYPTION_KEY` | Encrypted studio backups — see [Backup and Restore](/docs/backup-and-restore) |

## Where these live

Each environment (local, staging, production) has its own set of
values, never shared between them. See [Local Setup](/docs/local-setup)
for local development and the deployment guides
(`docs/deployment-guides/` in the source repository) for how each
hosting target stores these securely.
