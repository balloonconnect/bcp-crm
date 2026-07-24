-- Global search & command menu (Prompt 40): recent-search history and
-- named saved searches, both scoped to the individual studio user, not
-- just the studio. The 13 searchable entities themselves are queried
-- live via the PostgreSQL search provider — this migration adds no
-- search index tables, keeping the architecture ready to swap in
-- Meilisearch/Elasticsearch later without a schema change here.
-- Additive on top of 20260710003600.

-- ── RecentSearch ─────────────────────────────────────────────────────
CREATE TABLE "recent_searches" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recent_searches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "recent_searches_studio_id_idx" ON "recent_searches"("studio_id");
CREATE INDEX "recent_searches_user_id_created_at_idx" ON "recent_searches"("user_id", "created_at");
ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── SavedSearch ──────────────────────────────────────────────────────
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "entity_types" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "saved_searches_studio_id_idx" ON "saved_searches"("studio_id");
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
