# Architecture

A technical overview for engineers working on or operating BCP Studio OS.

## The apps

| App | Purpose |
|---|---|
| `studio-web` | The main app a studio's team uses day-to-day |
| `client-portal` | Where a studio's clients log in |
| `gallery-web` | Public gallery viewing, photo selection, e-albums |
| `platform-admin` | The platform operator's own control panel |
| `marketing-web`, `docs-web`, `status-web` | Public-facing: marketing site, this documentation, the status page |
| `api` | The single Fastify backend every other app talks to |
| `worker` | Background job processing (email, WhatsApp, image processing, AI analysis, and more) |

Every app is a separate deployable — see [Production Deployment](/docs/production-deployment).

## Shared packages

Business logic that doesn't need a database or network connection
lives in `packages/*` — pricing rules, validation, state machines,
report generation, and more — shared between `api` and `worker`
(and, where relevant, the frontend apps) rather than duplicated.

## Multi-tenancy

One deployment of each app serves every studio. A studio's data is
isolated at the database layer — every tenant-scoped query is
automatically checked against the studio the request belongs to, and
any attempt to read or write another studio's data is rejected
outright, not just filtered out silently.

## Data flow

```
Client apps (browser) → api (Fastify) → PostgreSQL
                              │
                              ├──→ Redis (cache + background job queues)
                              ├──→ Object storage (S3-compatible)
                              └──→ worker (consumes background jobs)
```

## Background processing

Anything that shouldn't hold up a request — sending an email or
WhatsApp message, processing an uploaded photo, generating a PDF,
running AI analysis — is queued and picked up by `worker`, with
automatic retry and a dead-letter queue for anything that keeps
failing after several attempts.

## AI features

Face search, photo quality analysis, the AI Studio Copilot, and the
AI Marketing Studio are all built as optional features — if the AI
provider isn't configured, those specific features are unavailable
with a clear message, but the rest of the platform works normally.

## Further reading

- [Database](/docs/database)
- [Security](/docs/security)
- [API Documentation](/docs/api-documentation)
