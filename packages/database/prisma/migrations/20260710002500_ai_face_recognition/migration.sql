-- AI face recognition (Prompt 28): one AWS Rekognition collection per
-- gallery (never shared across galleries or studios — structurally
-- enforces no-cross-studio/no-unauthorized-cross-event search), indexed
-- faces per photo, guest search sessions with consent gating and
-- selfie-deletion proof, matches with manual-correction support, and
-- an append-only consent/privacy log. Additive on top of 20260710002400.

CREATE TYPE "FaceCollectionStatus" AS ENUM ('active', 'building', 'failed');
CREATE TYPE "FaceSearchMode" AS ENUM ('live_scan', 'selfie_upload');
CREATE TYPE "FaceSearchStatus" AS ENUM ('pending', 'detecting', 'searching', 'completed', 'no_match', 'failed');

-- ── Gallery: new columns ─────────────────────────────────────────────
ALTER TABLE "galleries"
  ADD COLUMN "face_search_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "face_search_confidence_threshold" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "face_search_retention_days" INTEGER NOT NULL DEFAULT 30;

-- ── FaceCollection ───────────────────────────────────────────────────
CREATE TABLE "face_collections" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "provider_collection_id" TEXT NOT NULL,
    "status" "FaceCollectionStatus" NOT NULL DEFAULT 'building',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "face_collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "face_collections_gallery_id_key" ON "face_collections"("gallery_id");
CREATE UNIQUE INDEX "face_collections_provider_collection_id_key" ON "face_collections"("provider_collection_id");
CREATE INDEX "face_collections_studio_id_idx" ON "face_collections"("studio_id");
ALTER TABLE "face_collections" ADD CONSTRAINT "face_collections_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "face_collections" ADD CONSTRAINT "face_collections_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FaceIndexEntry ───────────────────────────────────────────────────
CREATE TABLE "face_index_entries" (
    "id" UUID NOT NULL,
    "face_collection_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "provider_face_id" TEXT NOT NULL,
    "bounding_box" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "face_index_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "face_index_entries_provider_face_id_key" ON "face_index_entries"("provider_face_id");
CREATE INDEX "face_index_entries_face_collection_id_idx" ON "face_index_entries"("face_collection_id");
CREATE INDEX "face_index_entries_gallery_photo_id_idx" ON "face_index_entries"("gallery_photo_id");
ALTER TABLE "face_index_entries" ADD CONSTRAINT "face_index_entries_face_collection_id_fkey" FOREIGN KEY ("face_collection_id") REFERENCES "face_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "face_index_entries" ADD CONSTRAINT "face_index_entries_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FaceSearchSession ────────────────────────────────────────────────
CREATE TABLE "face_search_sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "guest_token" TEXT NOT NULL,
    "mode" "FaceSearchMode" NOT NULL,
    "status" "FaceSearchStatus" NOT NULL DEFAULT 'pending',
    "consented_at" TIMESTAMP(3),
    "detected_face_count" INTEGER NOT NULL DEFAULT 0,
    "low_light_warning" BOOLEAN NOT NULL DEFAULT false,
    "confidence_threshold" INTEGER NOT NULL,
    "failure_reason" TEXT,
    "selfie_deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "face_search_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "face_search_sessions_studio_id_idx" ON "face_search_sessions"("studio_id");
CREATE INDEX "face_search_sessions_gallery_id_idx" ON "face_search_sessions"("gallery_id");
CREATE INDEX "face_search_sessions_gallery_id_guest_token_idx" ON "face_search_sessions"("gallery_id", "guest_token");
ALTER TABLE "face_search_sessions" ADD CONSTRAINT "face_search_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "face_search_sessions" ADD CONSTRAINT "face_search_sessions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FaceSearchMatch ──────────────────────────────────────────────────
CREATE TABLE "face_search_matches" (
    "id" UUID NOT NULL,
    "face_search_session_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "manually_corrected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "face_search_matches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "face_search_matches_face_search_session_id_gallery_photo__key" ON "face_search_matches"("face_search_session_id", "gallery_photo_id");
CREATE INDEX "face_search_matches_face_search_session_id_idx" ON "face_search_matches"("face_search_session_id");
ALTER TABLE "face_search_matches" ADD CONSTRAINT "face_search_matches_face_search_session_id_fkey" FOREIGN KEY ("face_search_session_id") REFERENCES "face_search_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "face_search_matches" ADD CONSTRAINT "face_search_matches_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FaceConsentLog ───────────────────────────────────────────────────
CREATE TABLE "face_consent_logs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "guest_token" TEXT NOT NULL,
    "consent_text" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "face_consent_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "face_consent_logs_studio_id_idx" ON "face_consent_logs"("studio_id");
CREATE INDEX "face_consent_logs_gallery_id_idx" ON "face_consent_logs"("gallery_id");
ALTER TABLE "face_consent_logs" ADD CONSTRAINT "face_consent_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "face_consent_logs" ADD CONSTRAINT "face_consent_logs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
