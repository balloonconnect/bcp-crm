-- Partial unique indexes: constraints Prisma's schema language can't express
-- directly (conditional uniqueness), added by hand here. Because Postgres
-- treats every NULL as distinct in a normal unique index, `@@unique` in
-- schema.prisma cannot enforce "only one row per key when studio_id IS NULL,
-- but many rows share NULL studio_id for different keys" — a partial index
-- with a WHERE clause is the standard fix.

-- FeatureFlag: exactly one global default row per key (studio_id IS NULL),
-- and exactly one override row per (studio_id, key) when studio_id is set.
CREATE UNIQUE INDEX "feature_flags_key_global_key" ON "feature_flags"("key") WHERE "studio_id" IS NULL;
CREATE UNIQUE INDEX "feature_flags_studio_id_key_key" ON "feature_flags"("studio_id", "key") WHERE "studio_id" IS NOT NULL;

-- StudioDomain: at most one primary domain per studio. A studio can still
-- have several non-primary domains, so this can't be a plain @@unique on
-- (studio_id, is_primary) either — that would also cap non-primary rows at
-- one per studio, which isn't the intent.
CREATE UNIQUE INDEX "studio_domains_studio_id_primary_key" ON "studio_domains"("studio_id") WHERE "is_primary" = true;

-- StudioBranch: at most one primary branch per studio, same reasoning.
CREATE UNIQUE INDEX "studio_branches_studio_id_primary_key" ON "studio_branches"("studio_id") WHERE "is_primary" = true;

-- Invitation: at most one *pending* invite per (studio, email) — a person
-- can be re-invited after their previous invite expired/was revoked, but
-- not have two pending invites open at once.
CREATE UNIQUE INDEX "invitations_studio_id_email_pending_key" ON "invitations"("studio_id", "email") WHERE "status" = 'pending';
