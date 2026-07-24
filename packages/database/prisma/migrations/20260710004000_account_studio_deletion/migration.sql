-- Account & studio deletion (Prompt 43): studio deletion carries the
-- same Platform Admin approval gate as encrypted backup/restore
-- (Prompt 41) — the most destructive action in the platform gets the
-- same two-step human-in-the-loop discipline, not a lighter one.
-- Account (StudioUser) deletion reuses the existing soft-delete
-- convention and needs no new table. Additive on top of
-- 20260710003900.

CREATE TYPE "StudioDeletionStatus" AS ENUM ('requested', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'failed');

CREATE TABLE "studio_deletion_requests" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "status" "StudioDeletionStatus" NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "requested_by" UUID,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "studio_deletion_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_deletion_requests_studio_id_idx" ON "studio_deletion_requests"("studio_id");
ALTER TABLE "studio_deletion_requests" ADD CONSTRAINT "studio_deletion_requests_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
