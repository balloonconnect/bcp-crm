-- Reports & analytics (Prompt 39): saved report configurations
-- (filters snapshotted, not just a bookmark) and recurring scheduled
-- reports emailed on a cadence, independent of anyone opening the
-- report UI. The 22 report types themselves are computed on demand
-- from existing data — this migration adds no new business data,
-- only the saved-configuration and scheduling layer. Additive on top
-- of 20260710003500.

CREATE TYPE "ReportType" AS ENUM ('leads', 'sources', 'conversion', 'quotations', 'bookings', 'revenue', 'payments', 'outstanding_amounts', 'expenses', 'profit', 'packages', 'event_types', 'branches', 'team_performance', 'freelancer_cost', 'album_production', 'gallery_activity', 'client_satisfaction', 'referrals', 'storage', 'ai_usage', 'whatsapp_usage');
CREATE TYPE "ScheduledReportFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- ── SavedReport ──────────────────────────────────────────────────────
CREATE TABLE "saved_reports" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "saved_reports_studio_id_idx" ON "saved_reports"("studio_id");
CREATE INDEX "saved_reports_studio_id_report_type_idx" ON "saved_reports"("studio_id", "report_type");
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ScheduledReport ──────────────────────────────────────────────────
CREATE TABLE "scheduled_reports" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "saved_report_id" UUID NOT NULL,
    "frequency" "ScheduledReportFrequency" NOT NULL,
    "recipient_emails" TEXT[] NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sent_at" TIMESTAMP(3),
    "next_send_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scheduled_reports_studio_id_idx" ON "scheduled_reports"("studio_id");
CREATE INDEX "scheduled_reports_is_active_next_send_at_idx" ON "scheduled_reports"("is_active", "next_send_at");
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_saved_report_id_fkey" FOREIGN KEY ("saved_report_id") REFERENCES "saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
