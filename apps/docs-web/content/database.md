# Database

PostgreSQL is the single source of truth for everything in BCP Studio
OS — every studio's leads, clients, events, galleries, invoices, and
more, all in one database, safely isolated by studio.

## How isolation works

Every table that belongs to a studio has its own `studio_id` column.
Every query the application makes is automatically scoped to the
studio the current request belongs to — there is no code path where
one studio's data can accidentally appear in another studio's
results, even if a developer forgets to add a filter by hand. This is
checked in code review and by an automated test that verifies every
table storing studio data is properly protected.

## Schema changes

Every change to the database structure is a numbered, version-
controlled file, applied in order. Changes are tested against a
staging copy of the database before ever reaching production — see
[Backup and Restore](/docs/backup-and-restore) for how backups fit
into this, and the engineering documentation
(`docs/database-migrations-and-rollback.md` in the source repository)
for the full technical detail.

## What's stored where

- **PostgreSQL** — everything structured: studios, people, events,
  money, galleries' metadata.
- **Object storage** (S3-compatible) — the actual photo files, PDFs,
  and exports.
- **Redis** — background job queues and short-lived cache data, never
  anything that needs to survive permanently.

## Backups

See [Backup and Restore](/docs/backup-and-restore).
