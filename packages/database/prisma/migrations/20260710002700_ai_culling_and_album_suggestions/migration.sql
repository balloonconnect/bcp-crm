-- AI culling & album suggestions (Prompt 30): a preset-driven culling
-- pipeline (group similar photos, recommend best, protect emotional
-- moments, avoid repeated poses) built on top of Prompt 29's
-- PhotoAnalysis/DuplicateGroup signals, plus AI-generated album
-- proposals (recommended photos, sequence, cover). Additive on top of
-- 20260710002600.

CREATE TYPE "CullingPresetType" AS ENUM ('wedding', 'engagement', 'baby', 'maternity', 'birthday', 'corporate', 'school');
CREATE TYPE "CullingSessionStatus" AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE "CullingRecommendationType" AS ENUM ('include', 'exclude', 'review');
CREATE TYPE "CullingReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- ── CullingSession ───────────────────────────────────────────────────
CREATE TABLE "culling_sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "preset_type" "CullingPresetType" NOT NULL,
    "priority_weights" JSONB NOT NULL,
    "important_face_ids" TEXT[] NOT NULL DEFAULT '{}',
    "status" "CullingSessionStatus" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "culling_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "culling_sessions_studio_id_idx" ON "culling_sessions"("studio_id");
CREATE INDEX "culling_sessions_gallery_id_idx" ON "culling_sessions"("gallery_id");
ALTER TABLE "culling_sessions" ADD CONSTRAINT "culling_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "culling_sessions" ADD CONSTRAINT "culling_sessions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CullingRecommendation ────────────────────────────────────────────
CREATE TABLE "culling_recommendations" (
    "id" UUID NOT NULL,
    "culling_session_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "recommendation" "CullingRecommendationType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "technical_issues" TEXT[] NOT NULL DEFAULT '{}',
    "is_emotional_moment" BOOLEAN NOT NULL DEFAULT false,
    "is_repeated_pose" BOOLEAN NOT NULL DEFAULT false,
    "status" "CullingReviewStatus" NOT NULL DEFAULT 'pending',
    CONSTRAINT "culling_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "culling_recommendations_culling_session_id_gallery_photo__key" ON "culling_recommendations"("culling_session_id", "gallery_photo_id");
CREATE INDEX "culling_recommendations_culling_session_id_idx" ON "culling_recommendations"("culling_session_id");
CREATE INDEX "culling_recommendations_gallery_photo_id_idx" ON "culling_recommendations"("gallery_photo_id");
ALTER TABLE "culling_recommendations" ADD CONSTRAINT "culling_recommendations_culling_session_id_fkey" FOREIGN KEY ("culling_session_id") REFERENCES "culling_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "culling_recommendations" ADD CONSTRAINT "culling_recommendations_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumSuggestion ──────────────────────────────────────────────────
CREATE TABLE "album_suggestions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "preset_type" "CullingPresetType" NOT NULL,
    "target_photo_count" INTEGER NOT NULL,
    "status" "CullingSessionStatus" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "album_suggestions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "album_suggestions_studio_id_idx" ON "album_suggestions"("studio_id");
CREATE INDEX "album_suggestions_gallery_id_idx" ON "album_suggestions"("gallery_id");
ALTER TABLE "album_suggestions" ADD CONSTRAINT "album_suggestions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_suggestions" ADD CONSTRAINT "album_suggestions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumSuggestionPhoto ─────────────────────────────────────────────
CREATE TABLE "album_suggestion_photos" (
    "id" UUID NOT NULL,
    "album_suggestion_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "is_cover_recommendation" BOOLEAN NOT NULL DEFAULT false,
    "moment_category" TEXT,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "CullingReviewStatus" NOT NULL DEFAULT 'pending',
    CONSTRAINT "album_suggestion_photos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "album_suggestion_photos_album_suggestion_id_gallery_photo__key" ON "album_suggestion_photos"("album_suggestion_id", "gallery_photo_id");
CREATE INDEX "album_suggestion_photos_album_suggestion_id_idx" ON "album_suggestion_photos"("album_suggestion_id");
CREATE INDEX "album_suggestion_photos_gallery_photo_id_idx" ON "album_suggestion_photos"("gallery_photo_id");
ALTER TABLE "album_suggestion_photos" ADD CONSTRAINT "album_suggestion_photos_album_suggestion_id_fkey" FOREIGN KEY ("album_suggestion_id") REFERENCES "album_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_suggestion_photos" ADD CONSTRAINT "album_suggestion_photos_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
