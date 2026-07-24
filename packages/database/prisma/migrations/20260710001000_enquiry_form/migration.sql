-- Public enquiry form (Prompt 13): studio-configurable public lead
-- capture forms, plus a submission audit trail distinct from the Lead
-- records they create. Additive on top of 20260710000900.

CREATE TYPE "PreferredContactMethod" AS ENUM ('phone', 'email', 'whatsapp');

CREATE TABLE "enquiry_forms" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "form_fields_config" JSONB NOT NULL DEFAULT '{}',
    "event_types" TEXT[] NOT NULL,
    "contact_methods" "PreferredContactMethod"[] NOT NULL,
    "consent_required" BOOLEAN NOT NULL DEFAULT true,
    "consent_text" TEXT NOT NULL DEFAULT 'I agree to be contacted about my enquiry.',
    "terms_url" TEXT,
    "terms_text" TEXT,
    "success_message" TEXT NOT NULL DEFAULT 'Thanks — we''ve received your enquiry and will be in touch shortly.',
    "auto_response_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_response_message" TEXT,
    "default_assigned_to" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "enquiry_forms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "enquiry_forms_studio_id_slug_key" ON "enquiry_forms"("studio_id", "slug");
CREATE INDEX "enquiry_forms_studio_id_idx" ON "enquiry_forms"("studio_id");
ALTER TABLE "enquiry_forms" ADD CONSTRAINT "enquiry_forms_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "enquiry_form_submissions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "lead_id" UUID,
    "payload" JSONB NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "referrer" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_text_snapshot" TEXT,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "spam_flagged" BOOLEAN NOT NULL DEFAULT false,
    "spam_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enquiry_form_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "enquiry_form_submissions_studio_id_idx" ON "enquiry_form_submissions"("studio_id");
CREATE INDEX "enquiry_form_submissions_form_id_idx" ON "enquiry_form_submissions"("form_id");
CREATE INDEX "enquiry_form_submissions_studio_id_created_at_idx" ON "enquiry_form_submissions"("studio_id", "created_at");
ALTER TABLE "enquiry_form_submissions" ADD CONSTRAINT "enquiry_form_submissions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enquiry_form_submissions" ADD CONSTRAINT "enquiry_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "enquiry_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enquiry_form_submissions" ADD CONSTRAINT "enquiry_form_submissions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
