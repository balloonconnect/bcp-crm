# Database Migrations and Rollback

How schema changes actually reach production safely, and what to do
when one goes wrong.

## The migration model this platform already uses

Every schema change across this entire build (42 migrations by the end
of Prompt 46, accumulating to 185 models) is a hand-authored, numbered
SQL file under `packages/database/prisma/migrations/` — `prisma migrate deploy`
applies whichever of these haven't run yet, in order, tracked in the
database's own `_prisma_migrations` table. This is deliberately
**never** run as part of application startup (no `migrate deploy`
inside `api`'s or `worker`'s own boot sequence) — it's a distinct
release step every deployment guide in
[docs/deployment-guides/](deployment-guides/) runs *before* the new
application image starts receiving traffic, for one concrete reason:
if a migration and a new image both deploy simultaneously, a partially
migrated database serving old-code requests (or new-code requests
against an old schema) is a real, common source of production
incidents. Sequencing removes that window entirely.

## Staging first, always

Every migration runs against staging before production — the same
migration file, the same `prisma migrate deploy` command, against a
database that's a real (if smaller/anonymized) copy of production's
shape. A migration that's only ever been tested against a
freshly-seeded dev database has not actually been tested against what
production will do to it (existing rows with unexpected NULLs, a table
large enough that an `ALTER TABLE` takes real time and locks
concerningly long).

## Writing a safe migration

- **Additive changes are always safe**: a new nullable column, a new
  table, a new index (created `CONCURRENTLY` on Postgres for a large
  existing table, to avoid a blocking lock) can deploy without any
  coordination with the application code that will use it.
- **Backward-incompatible changes need two deploys, not one**: renaming
  or dropping a column the currently-running application code still
  reads/writes will break that running code the instant the migration
  applies, before the new application code (which stopped using the
  old name) is even live. The safe sequence is: (1) deploy a migration
  that adds the new column/table alongside the old one, (2) deploy
  application code that writes to both and reads from the new one, (3)
  backfill existing rows, (4) only then, in a later deploy, drop the
  old column. This platform's own history has real examples of this
  care — see how `ClientContract.signedByName` was added ahead of the
  richer signing flow in Prompt 34, rather than the richer flow's
  columns landing all at once with no transition.
- **Every migration this platform has shipped is checked twice before
  merging**: a relational-integrity script (parsing the schema
  directly — every model's foreign keys have a real back-relation, no
  duplicate models/enums/fields) and, since Prompt 43, an automated
  test verifying every model with its own `studioId` is registered for
  tenant scoping. Both are cheap, fast, and have already caught real
  bugs before they shipped in this build — run them on every PR that
  touches `schema.prisma`, not just before a release.

## Rollback

**Rolling back the application** (a bad deploy, not a bad migration)
is fast and safe on every target this platform supports — a Kubernetes
`rollout undo`, a Railway/Fly.io redeploy of the previous image tag, a
Vercel "promote to production" of a previous deployment. None of these
touch the database.

**Rolling back a migration is a fundamentally harder, different
problem**, and this platform is honest about that rather than
pretending a one-command rollback exists: Prisma has no built-in
`migrate down`. The real options, in order of preference:

1. **Write a new, forward migration that undoes the change**
   (re-adding a dropped column, reverting a type change) — this is
   almost always the right answer, since it keeps the migration
   history linear and honest about what actually happened to the
   database, rather than rewriting history.
2. **Restore from a backup taken immediately before the migration ran**
   — only reasonable for a genuinely destructive migration caught
   within minutes, since it also rolls back every other write that
   happened since the backup.
3. **Manually reverse the SQL** for a migration that turns out to be
   trivially reversible (e.g., an added nullable column with no data
   in it yet) — acceptable for something this contained, but treat it
   as the exception, not the default plan.

The practical takeaway: the real defense against needing a rollback at
all is the staging-first discipline above, plus writing migrations
additively whenever the change allows it. A migration that was
genuinely tested against a production-shaped staging database rarely
needs rolling back in the first place.
