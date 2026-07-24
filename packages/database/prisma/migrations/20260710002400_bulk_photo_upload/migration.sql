-- Bulk photo upload (Prompt 27): a real chunked/multipart upload
-- pipeline — UploadSession (persists across reloads, drives pause/
-- resume/retry, checksums for duplicate detection before any bytes
-- transfer) and UploadChunk (per-part S3 multipart tracking). Also
-- expands GalleryPhoto with the derivative/metadata fields the upload
-- pipeline generates (preview, checksum, EXIF, blur placeholder).
-- Additive on top of 20260710002300.

CREATE TYPE "UploadStatus" AS ENUM ('pending', 'uploading', 'paused', 'processing', 'completed', 'failed');
CREATE TYPE "UploadChunkStatus" AS ENUM ('pending', 'uploaded', 'failed');

-- ── GalleryPhoto: new columns ────────────────────────────────────────
ALTER TABLE "gallery_photos"
  ADD COLUMN "preview_key" TEXT,
  ADD COLUMN "checksum" TEXT,
  ADD COLUMN "exif_data" JSONB,
  ADD COLUMN "blur_placeholder" TEXT;

CREATE UNIQUE INDEX "gallery_photos_gallery_id_checksum_key" ON "gallery_photos"("gallery_id", "checksum");

-- ── UploadSession ────────────────────────────────────────────────────
CREATE TABLE "upload_sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'pending',
    "storage_key" TEXT NOT NULL,
    "multipart_upload_id" TEXT,
    "chunk_size" INTEGER NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "uploaded_chunks" INTEGER NOT NULL DEFAULT 0,
    "prefer_wifi" BOOLEAN NOT NULL DEFAULT false,
    "resulting_photo_id" UUID,
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "upload_sessions_studio_id_idx" ON "upload_sessions"("studio_id");
CREATE INDEX "upload_sessions_gallery_id_idx" ON "upload_sessions"("gallery_id");
CREATE INDEX "upload_sessions_gallery_id_checksum_idx" ON "upload_sessions"("gallery_id", "checksum");
CREATE INDEX "upload_sessions_gallery_id_status_idx" ON "upload_sessions"("gallery_id", "status");
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── UploadChunk ──────────────────────────────────────────────────────
CREATE TABLE "upload_chunks" (
    "id" UUID NOT NULL,
    "upload_session_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "UploadChunkStatus" NOT NULL DEFAULT 'pending',
    "etag" TEXT,
    "uploaded_at" TIMESTAMP(3),
    CONSTRAINT "upload_chunks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "upload_chunks_upload_session_id_chunk_index_key" ON "upload_chunks"("upload_session_id", "chunk_index");
CREATE INDEX "upload_chunks_upload_session_id_idx" ON "upload_chunks"("upload_session_id");
ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_upload_session_id_fkey" FOREIGN KEY ("upload_session_id") REFERENCES "upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
