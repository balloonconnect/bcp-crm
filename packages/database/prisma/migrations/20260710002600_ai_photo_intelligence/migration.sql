-- Advanced AI photo intelligence (Prompt 29): per-photo quality/content
-- analysis (blur, exposure, noise, sharpness, faces, smile, scene,
-- composition, an overall quality score), an undo-capable review audit
-- trail supporting bulk review, and duplicate/near-duplicate grouping
-- with best-shot selection. Every result carries confidence +
-- explanation; approving/rejecting never deletes or hides a photo
-- automatically. Additive on top of 20260710002500.

CREATE TYPE "AnalysisReviewStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ExposureAssessment" AS ENUM ('underexposed', 'good', 'overexposed');
CREATE TYPE "DuplicateGroupType" AS ENUM ('exact_duplicate', 'near_duplicate');
CREATE TYPE "PhotoReviewAction" AS ENUM ('approved', 'rejected', 'undone');

-- ── PhotoAnalysis ────────────────────────────────────────────────────
CREATE TABLE "photo_analyses" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "blur_score" DOUBLE PRECISION NOT NULL,
    "is_blurry" BOOLEAN NOT NULL,
    "sharpness_score" DOUBLE PRECISION NOT NULL,
    "noise_score" DOUBLE PRECISION NOT NULL,
    "exposure_score" DOUBLE PRECISION NOT NULL,
    "exposure_assessment" "ExposureAssessment" NOT NULL,
    "face_count" INTEGER NOT NULL DEFAULT 0,
    "closed_eye_detected" BOOLEAN NOT NULL DEFAULT false,
    "smile_detected" BOOLEAN NOT NULL DEFAULT false,
    "is_group_photo" BOOLEAN NOT NULL DEFAULT false,
    "subject_prominence_score" DOUBLE PRECISION NOT NULL,
    "scene_classification" TEXT,
    "moment_tags" TEXT[] NOT NULL DEFAULT '{}',
    "composition_score" DOUBLE PRECISION NOT NULL,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "AnalysisReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photo_analyses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "photo_analyses_gallery_photo_id_key" ON "photo_analyses"("gallery_photo_id");
CREATE INDEX "photo_analyses_studio_id_idx" ON "photo_analyses"("studio_id");
CREATE INDEX "photo_analyses_gallery_photo_id_idx" ON "photo_analyses"("gallery_photo_id");
ALTER TABLE "photo_analyses" ADD CONSTRAINT "photo_analyses_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_analyses" ADD CONSTRAINT "photo_analyses_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PhotoAnalysisReviewLog ───────────────────────────────────────────
CREATE TABLE "photo_analysis_review_logs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "photo_analysis_id" UUID NOT NULL,
    "action" "PhotoReviewAction" NOT NULL,
    "previous_status" "AnalysisReviewStatus" NOT NULL,
    "new_status" "AnalysisReviewStatus" NOT NULL,
    "batch_id" UUID,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photo_analysis_review_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "photo_analysis_review_logs_studio_id_idx" ON "photo_analysis_review_logs"("studio_id");
CREATE INDEX "photo_analysis_review_logs_photo_analysis_id_idx" ON "photo_analysis_review_logs"("photo_analysis_id");
CREATE INDEX "photo_analysis_review_logs_batch_id_idx" ON "photo_analysis_review_logs"("batch_id");
ALTER TABLE "photo_analysis_review_logs" ADD CONSTRAINT "photo_analysis_review_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_analysis_review_logs" ADD CONSTRAINT "photo_analysis_review_logs_photo_analysis_id_fkey" FOREIGN KEY ("photo_analysis_id") REFERENCES "photo_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── DuplicateGroup ───────────────────────────────────────────────────
CREATE TABLE "duplicate_groups" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "group_type" "DuplicateGroupType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "AnalysisReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "duplicate_groups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "duplicate_groups_studio_id_idx" ON "duplicate_groups"("studio_id");
CREATE INDEX "duplicate_groups_gallery_id_idx" ON "duplicate_groups"("gallery_id");
ALTER TABLE "duplicate_groups" ADD CONSTRAINT "duplicate_groups_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "duplicate_groups" ADD CONSTRAINT "duplicate_groups_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── DuplicateGroupMember ─────────────────────────────────────────────
CREATE TABLE "duplicate_group_members" (
    "id" UUID NOT NULL,
    "duplicate_group_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "is_best_shot" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "duplicate_group_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "duplicate_group_members_duplicate_group_id_gallery_photo__key" ON "duplicate_group_members"("duplicate_group_id", "gallery_photo_id");
CREATE INDEX "duplicate_group_members_duplicate_group_id_idx" ON "duplicate_group_members"("duplicate_group_id");
CREATE INDEX "duplicate_group_members_gallery_photo_id_idx" ON "duplicate_group_members"("gallery_photo_id");
ALTER TABLE "duplicate_group_members" ADD CONSTRAINT "duplicate_group_members_duplicate_group_id_fkey" FOREIGN KEY ("duplicate_group_id") REFERENCES "duplicate_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "duplicate_group_members" ADD CONSTRAINT "duplicate_group_members_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
