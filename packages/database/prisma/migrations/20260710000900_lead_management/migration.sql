-- Lead management (Prompt 12): expands the Prompt 11 v1 Lead into the
-- full field set + 9-stage pipeline, and adds LeadNote/LeadAttachment/
-- LeadCommunication. Additive on top of 20260710000800.

-- ── LeadStatus: swap in the new 9-stage pipeline, remapping old data ──
-- Postgres can't cheaply narrow an enum's value set (ALTER TYPE ... DROP
-- VALUE doesn't exist), so this recreates the type under a temp name,
-- migrates the column with an explicit old→new value mapping, then
-- drops the old type. Any existing 'quoted' rows become
-- 'quotation_sent'; 'converted' rows become 'won' (a lead that had
-- already converted is, definitionally, won).
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'meeting_scheduled', 'quotation_sent', 'negotiation', 'booking_pending', 'won', 'lost');

ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "status" TYPE "LeadStatus" USING (
  CASE "status"::text
    WHEN 'quoted' THEN 'quotation_sent'
    WHEN 'converted' THEN 'won'
    ELSE "status"::text
  END
)::"LeadStatus";
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new';

DROP TYPE "LeadStatus_old";

CREATE TYPE "LeadPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- ── Lead: new columns ────────────────────────────────────────────────
ALTER TABLE "leads"
  ADD COLUMN "bride_name" TEXT,
  ADD COLUMN "groom_name" TEXT,
  ADD COLUMN "alternate_mobile" TEXT,
  ADD COLUMN "instagram_profile_1" TEXT,
  ADD COLUMN "instagram_profile_2" TEXT,
  ADD COLUMN "venue" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "budget" INTEGER,
  ADD COLUMN "interested_package" TEXT,
  ADD COLUMN "priority" "LeadPriority" NOT NULL DEFAULT 'medium',
  ADD COLUMN "expected_value" INTEGER,
  ADD COLUMN "win_probability" INTEGER,
  ADD COLUMN "lost_reason" TEXT,
  ADD COLUMN "converted_client_id" UUID,
  ADD COLUMN "converted_at" TIMESTAMP(3);

CREATE INDEX "leads_studio_id_priority_idx" ON "leads"("studio_id", "priority");
CREATE INDEX "leads_studio_id_phone_idx" ON "leads"("studio_id", "phone");
CREATE INDEX "leads_studio_id_email_idx" ON "leads"("studio_id", "email");

ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_fkey" FOREIGN KEY ("converted_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── LeadNote ─────────────────────────────────────────────────────────
CREATE TABLE "lead_notes" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lead_notes_lead_id_idx" ON "lead_notes"("lead_id");
CREATE INDEX "lead_notes_studio_id_idx" ON "lead_notes"("studio_id");
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── LeadAttachment ───────────────────────────────────────────────────
CREATE TABLE "lead_attachments" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID,
    CONSTRAINT "lead_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lead_attachments_lead_id_idx" ON "lead_attachments"("lead_id");
CREATE INDEX "lead_attachments_studio_id_idx" ON "lead_attachments"("studio_id");
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── LeadCommunication ────────────────────────────────────────────────
CREATE TYPE "CommunicationChannel" AS ENUM ('call', 'email', 'whatsapp', 'sms', 'meeting', 'other');
CREATE TYPE "CommunicationDirection" AS ENUM ('inbound', 'outbound');

CREATE TABLE "lead_communications" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "lead_communications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lead_communications_lead_id_idx" ON "lead_communications"("lead_id");
CREATE INDEX "lead_communications_studio_id_idx" ON "lead_communications"("studio_id");
ALTER TABLE "lead_communications" ADD CONSTRAINT "lead_communications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_communications" ADD CONSTRAINT "lead_communications_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
