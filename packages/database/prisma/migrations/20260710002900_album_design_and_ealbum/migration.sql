-- Album design & 3D e-album (Prompt 32): the 11-stage production
-- pipeline (a dimension separate from the Prompt 31 selection-
-- lifecycle AlbumStatus), designer assignment, versioned spread
-- uploads with page comments/annotations/approval, revision-round
-- tracking against a limit, whole-album approval, expanded print
-- orders (specs, lab, courier), and a separate secure/OTP/password-
-- gated e-album viewer link. Additive on top of 20260710002800.

CREATE TYPE "AlbumProductionStage" AS ENUM ('photos_selected', 'designer_assigned', 'design_started', 'proof_uploaded', 'client_review', 'revision_requested', 'approved', 'sent_to_print', 'printed', 'dispatched', 'delivered');
CREATE TYPE "AlbumSpreadStatus" AS ENUM ('draft', 'proof', 'approved', 'revision_requested');
CREATE TYPE "AlbumSpreadApprovalStatus" AS ENUM ('approved', 'revision_requested');

-- ── Album: new columns ───────────────────────────────────────────────
ALTER TABLE "albums"
  ADD COLUMN "designer_id" UUID,
  ADD COLUMN "designer_assigned_at" TIMESTAMP(3),
  ADD COLUMN "production_stage" "AlbumProductionStage" NOT NULL DEFAULT 'photos_selected',
  ADD COLUMN "revision_limit" INTEGER,
  ADD COLUMN "fully_approved_at" TIMESTAMP(3),
  ADD COLUMN "fully_approved_by_guest_token" TEXT,
  ADD COLUMN "e_album_token" TEXT,
  ADD COLUMN "e_album_password_hash" TEXT,
  ADD COLUMN "e_album_otp_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "e_album_download_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "albums_e_album_token_key" ON "albums"("e_album_token");
ALTER TABLE "albums" ADD CONSTRAINT "albums_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "studio_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── PrintOrder: new columns ──────────────────────────────────────────
ALTER TABLE "print_orders"
  ADD COLUMN "print_specification" JSONB,
  ADD COLUMN "lab_name" TEXT,
  ADD COLUMN "lab_contact_name" TEXT,
  ADD COLUMN "lab_contact_phone" TEXT,
  ADD COLUMN "lab_contact_email" TEXT,
  ADD COLUMN "courier_name" TEXT,
  ADD COLUMN "tracking_number" TEXT,
  ADD COLUMN "dispatched_at" TIMESTAMP(3),
  ADD COLUMN "delivered_at" TIMESTAMP(3);

-- ── AlbumSpread ──────────────────────────────────────────────────────
CREATE TABLE "album_spreads" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "spread_number" INTEGER NOT NULL,
    "version_number" INTEGER NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "file_key" TEXT NOT NULL,
    "status" "AlbumSpreadStatus" NOT NULL DEFAULT 'draft',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID,
    CONSTRAINT "album_spreads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "album_spreads_album_id_spread_number_version_number_key" ON "album_spreads"("album_id", "spread_number", "version_number");
CREATE INDEX "album_spreads_album_id_idx" ON "album_spreads"("album_id");
CREATE INDEX "album_spreads_album_id_spread_number_idx" ON "album_spreads"("album_id", "spread_number");
ALTER TABLE "album_spreads" ADD CONSTRAINT "album_spreads_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumSpreadComment ───────────────────────────────────────────────
CREATE TABLE "album_spread_comments" (
    "id" UUID NOT NULL,
    "album_spread_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "position_x" DOUBLE PRECISION,
    "position_y" DOUBLE PRECISION,
    "author_type" TEXT NOT NULL,
    "guest_token" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_spread_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "album_spread_comments_album_spread_id_idx" ON "album_spread_comments"("album_spread_id");
ALTER TABLE "album_spread_comments" ADD CONSTRAINT "album_spread_comments_album_spread_id_fkey" FOREIGN KEY ("album_spread_id") REFERENCES "album_spreads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumSpreadApproval ──────────────────────────────────────────────
CREATE TABLE "album_spread_approvals" (
    "id" UUID NOT NULL,
    "album_spread_id" UUID NOT NULL,
    "status" "AlbumSpreadApprovalStatus" NOT NULL,
    "comment" TEXT,
    "guest_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_spread_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "album_spread_approvals_album_spread_id_idx" ON "album_spread_approvals"("album_spread_id");
ALTER TABLE "album_spread_approvals" ADD CONSTRAINT "album_spread_approvals_album_spread_id_fkey" FOREIGN KEY ("album_spread_id") REFERENCES "album_spreads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AlbumRevisionRequest ─────────────────────────────────────────────
CREATE TABLE "album_revision_requests" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "guest_token" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_revision_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "album_revision_requests_album_id_idx" ON "album_revision_requests"("album_id");
ALTER TABLE "album_revision_requests" ADD CONSTRAINT "album_revision_requests_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EAlbumAccessSession ──────────────────────────────────────────────
CREATE TABLE "e_album_access_sessions" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "guest_token" TEXT NOT NULL,
    "password_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "e_album_access_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "e_album_access_sessions_guest_token_key" ON "e_album_access_sessions"("guest_token");
CREATE INDEX "e_album_access_sessions_album_id_idx" ON "e_album_access_sessions"("album_id");
ALTER TABLE "e_album_access_sessions" ADD CONSTRAINT "e_album_access_sessions_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
