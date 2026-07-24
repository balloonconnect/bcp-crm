-- Import, export & backup (Prompt 41): CSV import pipeline (column
-- mapping, validation, preview, duplicate handling, per-row error
-- report, retry) for 8 entity types, export jobs for 10 entity types
-- including complete studio data, and encrypted full-studio backup/
-- restore gated behind explicit Platform Admin approval — a studio
-- can request, never approve its own. Additive on top of
-- 20260710003700.

CREATE TYPE "ImportEntityType" AS ENUM ('leads', 'clients', 'packages', 'services', 'payments', 'vendors', 'equipment', 'gallery_metadata');
CREATE TYPE "ImportJobStatus" AS ENUM ('uploaded', 'mapping', 'previewing', 'processing', 'completed', 'failed', 'partially_completed');
CREATE TYPE "DuplicateHandling" AS ENUM ('skip', 'overwrite', 'create_new');
CREATE TYPE "ExportEntityType" AS ENUM ('leads', 'clients', 'bookings', 'events', 'payments', 'expenses', 'galleries', 'albums', 'audit_logs', 'complete_studio_data');
CREATE TYPE "ExportJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE "BackupStatus" AS ENUM ('requested', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'failed');
CREATE TYPE "RestoreJobStatus" AS ENUM ('requested', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'failed');

-- ── ImportJob ────────────────────────────────────────────────────────
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "entity_type" "ImportEntityType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'uploaded',
    "file_key" TEXT NOT NULL,
    "column_mapping" JSONB,
    "duplicate_handling" "DuplicateHandling" NOT NULL DEFAULT 'skip',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_jobs_studio_id_idx" ON "import_jobs"("studio_id");
CREATE INDEX "import_jobs_studio_id_status_idx" ON "import_jobs"("studio_id", "status");
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ImportJobError ───────────────────────────────────────────────────
CREATE TABLE "import_job_errors" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "error_message" TEXT NOT NULL,
    "retried" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_job_errors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_job_errors_import_job_id_idx" ON "import_job_errors"("import_job_id");
ALTER TABLE "import_job_errors" ADD CONSTRAINT "import_job_errors_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ExportJob ────────────────────────────────────────────────────────
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "export_type" "ExportEntityType" NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'pending',
    "filters" JSONB,
    "file_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by" UUID,
    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "export_jobs_studio_id_idx" ON "export_jobs"("studio_id");
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── StudioBackup ─────────────────────────────────────────────────────
CREATE TABLE "studio_backups" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'requested',
    "file_key" TEXT,
    "size_bytes" INTEGER,
    "encryption_key_id" TEXT,
    "requested_by" UUID,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "studio_backups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_backups_studio_id_idx" ON "studio_backups"("studio_id");
CREATE INDEX "studio_backups_status_idx" ON "studio_backups"("status");
ALTER TABLE "studio_backups" ADD CONSTRAINT "studio_backups_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── StudioRestoreJob ─────────────────────────────────────────────────
CREATE TABLE "studio_restore_jobs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "backup_id" UUID NOT NULL,
    "status" "RestoreJobStatus" NOT NULL DEFAULT 'requested',
    "requested_by" UUID,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    CONSTRAINT "studio_restore_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_restore_jobs_studio_id_idx" ON "studio_restore_jobs"("studio_id");
CREATE INDEX "studio_restore_jobs_backup_id_idx" ON "studio_restore_jobs"("backup_id");
ALTER TABLE "studio_restore_jobs" ADD CONSTRAINT "studio_restore_jobs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_restore_jobs" ADD CONSTRAINT "studio_restore_jobs_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "studio_backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
