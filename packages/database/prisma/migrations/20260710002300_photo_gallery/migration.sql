-- Photo gallery (Prompt 26): expands Gallery from a Prompt 11 status
-- tracker into the full public gallery product — unique link, QR
-- (derived from the token, no new column needed), password/OTP gating,
-- expiry, download controls, watermark settings, layout — plus real
-- photo storage (GalleryPhoto), guest access sessions, favorites,
-- comments, and download tracking. Additive on top of 20260710002200.

CREATE TYPE "GalleryLayout" AS ENUM ('grid', 'masonry', 'story', 'timeline', 'highlights');
CREATE TYPE "GalleryDownloadType" AS ENUM ('original', 'compressed');

-- ── Gallery: new columns ─────────────────────────────────────────────
ALTER TABLE "galleries"
  ADD COLUMN "branch_id" UUID,
  ADD COLUMN "public_token" TEXT,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "layout" "GalleryLayout" NOT NULL DEFAULT 'grid',
  ADD COLUMN "cover_photo_id" UUID,
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "otp_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "guest_access_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allow_original_download" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allow_compressed_download" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "download_limit_per_guest" INTEGER,
  ADD COLUMN "watermark_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "watermark_text" TEXT;

-- Backfill a public_token for any pre-existing rows before enforcing NOT NULL + uniqueness.
UPDATE "galleries" SET "public_token" = gen_random_uuid()::text WHERE "public_token" IS NULL;
ALTER TABLE "galleries" ALTER COLUMN "public_token" SET NOT NULL;
CREATE UNIQUE INDEX "galleries_public_token_key" ON "galleries"("public_token");

-- ── GalleryPhoto ─────────────────────────────────────────────────────
CREATE TABLE "gallery_photos" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "compressed_key" TEXT,
    "thumbnail_key" TEXT,
    "watermarked_key" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID,
    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gallery_photos_gallery_id_idx" ON "gallery_photos"("gallery_id");
CREATE INDEX "gallery_photos_gallery_id_is_hidden_idx" ON "gallery_photos"("gallery_id", "is_hidden");
CREATE INDEX "gallery_photos_studio_id_idx" ON "gallery_photos"("studio_id");
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── GalleryAccessSession ─────────────────────────────────────────────
CREATE TABLE "gallery_access_sessions" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "guest_token" TEXT NOT NULL,
    "guest_name" TEXT,
    "guest_phone" TEXT,
    "guest_email" TEXT,
    "password_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gallery_access_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gallery_access_sessions_guest_token_key" ON "gallery_access_sessions"("guest_token");
CREATE INDEX "gallery_access_sessions_gallery_id_idx" ON "gallery_access_sessions"("gallery_id");
ALTER TABLE "gallery_access_sessions" ADD CONSTRAINT "gallery_access_sessions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── GalleryFavorite ──────────────────────────────────────────────────
CREATE TABLE "gallery_favorites" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "photo_id" UUID NOT NULL,
    "guest_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gallery_favorites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gallery_favorites_photo_id_guest_token_key" ON "gallery_favorites"("photo_id", "guest_token");
CREATE INDEX "gallery_favorites_gallery_id_idx" ON "gallery_favorites"("gallery_id");
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── GalleryComment ───────────────────────────────────────────────────
CREATE TABLE "gallery_comments" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "photo_id" UUID,
    "guest_token" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gallery_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gallery_comments_gallery_id_idx" ON "gallery_comments"("gallery_id");
CREATE INDEX "gallery_comments_photo_id_idx" ON "gallery_comments"("photo_id");
ALTER TABLE "gallery_comments" ADD CONSTRAINT "gallery_comments_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_comments" ADD CONSTRAINT "gallery_comments_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── GalleryDownloadLog ───────────────────────────────────────────────
CREATE TABLE "gallery_download_logs" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "photo_id" UUID,
    "guest_token" TEXT NOT NULL,
    "download_type" "GalleryDownloadType" NOT NULL,
    "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gallery_download_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gallery_download_logs_gallery_id_idx" ON "gallery_download_logs"("gallery_id");
CREATE INDEX "gallery_download_logs_gallery_id_guest_token_idx" ON "gallery_download_logs"("gallery_id", "guest_token");
ALTER TABLE "gallery_download_logs" ADD CONSTRAINT "gallery_download_logs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_download_logs" ADD CONSTRAINT "gallery_download_logs_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
