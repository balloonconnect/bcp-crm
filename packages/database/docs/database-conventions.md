# Database Conventions

Rules `schema.prisma` follows, so any new model added later stays
consistent without re-deriving these decisions from scratch.

## Identifiers

- **Every table uses a UUID primary key**: `id String @id @default(uuid())
  @db.Uuid`. `@default(uuid())` generates the value in the **Prisma
  Client** (a v4 UUID), not in Postgres — there's no dependency on the
  `pgcrypto` or `uuid-ossp` extensions being installed. `@db.Uuid` still
  stores it as a native Postgres `uuid` column (16 bytes, indexable,
  type-checked), not `text`.
- Foreign key columns are typed `@db.Uuid` to match.
- `createdBy` / `updatedBy` / `assignedBy` / `invitedBy` / `revokedBy`-style
  actor columns are **plain `String? @db.Uuid`, not enforced foreign
  keys.** They soft-reference either `PlatformUser.id` or `StudioUser.id`
  depending on who acted — a real FK can't point at "one of two tables,"
  and a full polymorphic-association table felt like more machinery than
  this needs today. If a query needs the actor's name, resolve it in the
  application layer with an explicit `actorType` (available on `AuditLog`
  /`LoginHistory`/`Session`; inferred from context elsewhere).

## Naming

- **Prisma model/field names are camelCase** (`StudioUser.branchId`);
  **database table/column names are snake_case** via `@map`/`@@map`
  (`studio_users.branch_id`). This keeps generated TypeScript idiomatic
  while keeping SQL idiomatic, at the cost of every field needing an
  explicit `@map` — considered worth it since this schema is read (in SQL,
  directly) far more often than it's written.
- Table names are **plural** (`studios`, `studio_users`); this matches
  Prisma's own default pluralization convention closely enough that
  `@@map` values read the way you'd guess them.
- Enum **type** names are PascalCase and singular (`StudioStatus`); enum
  **values** are snake_case (`past_due`, `platform_user`) since they're
  effectively string constants that show up in JSON payloads and logs,
  where snake_case reads more like a stable API value than a TS
  identifier does.

## Multi-tenancy

- **Every studio-scoped model carries `studioId` directly on the row**
  (never only reachable via a join) — see
  [tenant-isolation.md](./tenant-isolation.md) for the full rationale and
  the short, deliberate list of models where it's nullable.
- **Every studio-scoped model indexes `studioId`** at minimum
  (`@@index([studioId])`), plus compound indexes for the query shapes
  that matter in practice — e.g. `@@index([studioId, status])` on models
  that are routinely filtered by both.
- Composite uniqueness is scoped to the tenant, not global, wherever the
  real-world constraint is "unique within this studio" — e.g.
  `StudioUser` is `@@unique([studioId, email])`, not `@unique` on `email`
  alone (see tenant-isolation.md § "Users in multiple studios").

## Branch support

- `StudioBranch` is a first-class model (not a free-text field), so
  branch-scoped reporting/permissions are queries, not string parsing.
- Branch association elsewhere is **nullable** by default
  (`StudioUser.branchId String?`) — a studio user without an assigned
  branch is valid (e.g. a studio owner who works across all branches),
  and `onDelete: SetNull` reflects that deleting a branch shouldn't delete
  the people who used to be assigned to it.
- Exactly one branch per studio may be `isPrimary = true`, enforced by a
  partial unique index (`studio_branches_studio_id_primary_key` in
  migration `20260710000100_partial_unique_indexes`) rather than
  application code alone, since this is cheap to guarantee at the database
  level and easy to get wrong in application code under concurrent writes.

## Soft deletion

Applied where a row represents something a person created and expects to
"delete" from a list, but where hard-deleting would either lose audit
value or cascade destructively: `Studio`, `StudioBranch`, `StudioUser`,
`StudioRole` (custom roles only, by convention — system roles aren't
deleted), `PlatformUser`, `WebhookEndpoint`. Each has a nullable
`deletedAt DateTime?`; a row with `deletedAt` set is excluded from normal
application queries but still physically present for audit/recovery.

**Not** soft-deleted, deliberately:

- **Append-only logs** (`AuditLog`, `LoginHistory`) — these are never
  deleted at all outside of a retention-policy job (out of scope for this
  phase); "soft delete" doesn't apply to a table that's immutable by
  design.
- **State-carrying operational rows** (`Session`, `ApiKey`,
  `Activation`, `LicenseKey`) — these already have a more specific status
  signal (`revokedAt`, `deactivatedAt`, `status` enum) that says *why*
  they're inactive, which a generic `deletedAt` would only duplicate.
- **Global catalogs** (`SubscriptionPlan`, `StudioPermission`,
  `PlatformPermission`, `PlatformRole`\*) — deprecated via `isActive`
  where that concept applies, or simply left alone; catalogs are curated
  by the codebase, not deleted by end users.
- **Join tables** (`StudioUserRole`, `PlatformUserRole`) — removing an
  association is a real delete (revoking a role), not a "soft" state.

\* `PlatformRole`/`StudioRole` custom (non-system) rows are the exception
noted above — `StudioRole` does have `deletedAt` for that reason.

## Audit columns

Every mutable, non-append-only model has `createdAt DateTime @default(now())`
and `updatedAt DateTime @updatedAt`, plus `createdBy`/`updatedBy` per the
Identifiers section above. Append-only logs (`AuditLog`, `LoginHistory`)
have only `createdAt` — there is no "updated" for an event that already
happened, and adding `updatedAt` there would imply logs can be edited,
which they must not be.

Resource-specific audit trails (e.g. domain add/verify/activate/remove
events) reuse `AuditLog` with `resourceType` set to the model name (e.g.
`"StudioDomain"`) rather than getting a dedicated per-resource audit
table — one audit mechanism, filterable by `resourceType`/`resourceId`,
is simpler to query across the whole product than N near-identical tables
would be. Add a dedicated audit table only if a resource's audit needs
genuinely diverge from `AuditLog`'s shape (e.g. needing its own retention
policy).

## Roles & permissions

`PlatformPermission`/`StudioPermission` are **flat catalogs** (id, key,
label, category) of permission keys the codebase understands — not
normalized into a `RolePermission` join table. Instead, `PlatformRole`
and `StudioRole` each carry `permissions: String[]`, an array of keys from
the matching catalog.

This was a deliberate tradeoff:

- **For:** custom roles (a hard requirement) are then just "insert a
  `StudioRole` row with any subset of `StudioPermission.key` values" — no
  join-table rows to manage in lockstep, and reading "what can this role
  do" is one row, not a join.
- **Against:** the database can't enforce that every string in
  `permissions[]` corresponds to a real `StudioPermission.key` — that
  validation happens in the application layer (or a `CHECK` constraint
  added later if it proves worth the migration). Referential integrity on
  array-of-keys is a real gap this trades away.

If per-permission metadata beyond the catalog (e.g. "who granted this
specific permission to this specific role, and when") ever becomes a
requirement, that's the signal to introduce a real join table — until
then, the flat-array approach is the simpler thing that satisfies "custom
roles" without it.

## Plan limits & feature flags

- `SubscriptionPlan.features` is a `Json` map of feature keys → limits/booleans
  (e.g. `{"whatsapp_automation": true, "ai_tools": false}`) — the *default*
  entitlement for any studio on that plan.
- `FeatureFlag` rows layer on top, resolved in this order: **a
  studio-specific `FeatureFlag` row for `key`** (if one exists) **→ the
  global-default `FeatureFlag` row for `key`** (`studioId = null`, if one
  exists) **→ the plan's `features` JSON** as the final fallback. This
  lets ops flip a flag for one studio (a pilot, a support workaround)
  without touching the plan catalog, while the plan catalog stays the
  source of truth for "what studios on this plan get by default."
- Numeric limits (`maxUsers`, `maxBranches`, `maxStorageGb`,
  `maxBookingsPerMonth`) live as typed columns on `SubscriptionPlan`
  rather than inside the `features` JSON, specifically so they're
  queryable/comparable in SQL (e.g. "which studios are within 90% of
  their branch limit") without JSON path expressions.
- `UsageRecord` is the metering side of the same system: one row per
  `(studioId, metric, periodStart)`, so "is this studio over its plan
  limit" is a lookup against the current period's `UsageRecord`, not a
  live aggregate query over raw event tables.

## JSON columns

Used narrowly, for genuinely schema-flexible data that doesn't need to be
queried/filtered by its internal shape in SQL: `StudioSetting.value`,
`SubscriptionPlan.features`, `FeatureFlag.payload`, `AuditLog.metadata`,
`Notification.metadata`, `JobRecord.payload`/`result`. Anything that needs
a `WHERE` clause on a specific field gets a real column instead — JSON is
for "the shape varies per key and we don't query into it," not a general
escape hatch from modeling.

## Migrations

Migrations live in `prisma/migrations/<timestamp>_<name>/migration.sql`,
one directory per migration, per Prisma's convention. Two exist today:

1. `20260710000000_init` — the full schema in one migration (appropriate
   for a not-yet-launched product; once this ships to a real environment,
   subsequent schema changes get their own incremental migrations, never
   edits to this one).
2. `20260710000100_partial_unique_indexes` — Postgres partial unique
   indexes (`CREATE UNIQUE INDEX ... WHERE ...`) for constraints
   `@@unique` can't express (conditional uniqueness — "at most one
   `isPrimary = true` per studio," "at most one `pending` invitation per
   email"). These are hand-written raw SQL because Prisma's schema
   language has no partial-index syntax; see the comment at the top of
   that file for exactly which constraints and why.

This repository's sandboxed build environment cannot reach
`binaries.prisma.sh` to download Prisma's query/schema-engine binaries, so
these migrations were authored by hand against the schema rather than
generated via `prisma migrate dev`. The very first time this runs
somewhere with normal network access, run `pnpm db:generate` and
`prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel
prisma/schema.prisma --script` to confirm the hand-written SQL and the
schema have not drifted, before trusting `prisma migrate dev` to generate
further migrations on top.

## Decimal vs. Int for money and metrics

- **Money** (`SubscriptionPlan.priceMonthly`/`priceYearly`) is stored as
  **`Int` in minor currency units** (paise, not rupees) — the standard
  way to avoid floating-point rounding entirely for currency, at the cost
  of remembering to divide by 100 for display.
- **Metered usage** (`UsageRecord.value`) is `Decimal(18, 4)` — usage
  metrics aren't always integers (e.g. fractional storage-GB-hours), and
  `Decimal` avoids float rounding error accumulating across many
  aggregated records the way `Float` would.

## What's deliberately not modeled yet

This phase is platform/tenant infrastructure only. Business-domain models
(bookings, quotations, galleries, payments-received, WhatsApp message
logs) are out of scope here by design — see the root README's phased
build order — and will reference `Studio`/`StudioBranch`/`StudioUser` by
id the same way every model in this file does, following every convention
above, when they're added.
