-- Client photo selection (Prompt 31): expands Album from the Prompt 11
-- status tracker into the real client-facing selection experience —
-- secure link + OTP, selection/category limits, deadline, lock/reopen,
-- favorite/select/deselect/reject/comment, an append-only selection
-- history, and guest access sessions. Additive on top of 20260710002700.

CREATE TYPE "AlbumSelectionStatus" AS ENUM ('pending', 'selected', 'rejected');
CREATE TYPE "AlbumSelectionAction" AS ENUM ('selected', 'deselected', 'favorited', 'unfavorited', 'rejected', 'commented', 'submitted', 'locked', 'reopened');

-- ── Album: new columns ───────────────────────────────────────────────
ALTER TABLE "albums"
  ADD COLUMN "source_gallery_id" UUID,
  ADD COLUMN "public_token" TEXT,
  ADD COLUMN "otp_required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "selection_limit" INTEGER,
  ADD COLUMN "deadline" TIMESTAMP(3),
  ADD COLUMN "locked_at" TIMESTAMP(3),
  ADD COLUMN "reopened_at" TIMESTAMP(3),
  ADD COLUMN "submitted_at" TIMESTAMP(3);

-- Backfill a public_token for any pre-existing rows before enforcing NOT NULL + uniqueness.
UPDATE "albums" SET "public_token" = gen_random_uuid()::text WHERE "public_token" IS NULL;
ALTER TABLE "albums" ALTER COLUMN "public_token" SET NOT NULL;
CREATE UNIQUE INDEX "albums_public_token_key" ON "albums"("public_token");
ALTER TABLE "albums" ADD CONSTRAINT "albums_source_gallery_id_fkey" FOREIGN KEY ("source_gallery_id") REFERENCES "galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── AlbumCategoryLimit ───────────────────────────────────────────────
CREATE TABLE "album_category_limits" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "limit_count" INTEGER NOT NULL,
    CONSTRAINT "album_category_limits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "album_category_limits_album_id_category_key" ON "album_category_limits"("album_id", "category");
CREATE INDEX "album_category_limits_album_id_idx" ON "album_category_limits"("album_id");
ALTER TABLE "album_category_limits" ADD CONSTRAINT "album_category_limits_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumSelectionItem ───────────────────────────────────────────────
CREATE TABLE "album_selection_items" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "status" "AlbumSelectionStatus" NOT NULL DEFAULT 'pending',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "guest_token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "album_selection_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "album_selection_items_album_id_gallery_photo_id_key" ON "album_selection_items"("album_id", "gallery_photo_id");
CREATE INDEX "album_selection_items_album_id_idx" ON "album_selection_items"("album_id");
CREATE INDEX "album_selection_items_album_id_status_idx" ON "album_selection_items"("album_id", "status");
ALTER TABLE "album_selection_items" ADD CONSTRAINT "album_selection_items_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_selection_items" ADD CONSTRAINT "album_selection_items_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumSelectionHistory ────────────────────────────────────────────
CREATE TABLE "album_selection_history" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "gallery_photo_id" UUID,
    "action" "AlbumSelectionAction" NOT NULL,
    "guest_token" TEXT,
    "actor_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_selection_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "album_selection_history_album_id_idx" ON "album_selection_history"("album_id");
CREATE INDEX "album_selection_history_album_id_created_at_idx" ON "album_selection_history"("album_id", "created_at");
ALTER TABLE "album_selection_history" ADD CONSTRAINT "album_selection_history_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_selection_history" ADD CONSTRAINT "album_selection_history_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumAccessSession ───────────────────────────────────────────────
CREATE TABLE "album_access_sessions" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "guest_token" TEXT NOT NULL,
    "guest_name" TEXT,
    "guest_phone" TEXT,
    "guest_email" TEXT,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_access_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "album_access_sessions_guest_token_key" ON "album_access_sessions"("guest_token");
CREATE INDEX "album_access_sessions_album_id_idx" ON "album_access_sessions"("album_id");
ALTER TABLE "album_access_sessions" ADD CONSTRAINT "album_access_sessions_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
