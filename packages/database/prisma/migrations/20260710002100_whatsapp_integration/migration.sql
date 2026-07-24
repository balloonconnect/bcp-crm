-- WhatsApp integration (Prompt 24): per-studio Cloud API configuration,
-- an approved-templates registry, a full outbound message log with
-- delivery status tracking, and per-phone opt-in/opt-out consent.
-- Additive on top of 20260710002000.

CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('marketing', 'utility', 'authentication');
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "WhatsAppMessageType" AS ENUM ('text', 'template', 'image', 'document');
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE "WhatsAppOptInStatus" AS ENUM ('opted_in', 'opted_out', 'unknown');

-- ── WhatsAppConfig ───────────────────────────────────────────────────
CREATE TABLE "whatsapp_configs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "meta_business_id" TEXT,
    "waba_id" TEXT,
    "phone_number_id" TEXT,
    "access_token" TEXT,
    "webhook_verify_token" TEXT,
    "default_sender_label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_configs_studio_id_key" ON "whatsapp_configs"("studio_id");
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── WhatsAppTemplate ─────────────────────────────────────────────────
CREATE TABLE "whatsapp_templates" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL DEFAULT 'utility',
    "language" TEXT NOT NULL DEFAULT 'en',
    "body_text" TEXT NOT NULL,
    "variable_count" INTEGER NOT NULL DEFAULT 0,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'pending',
    "meta_template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_templates_studio_id_name_language_key" ON "whatsapp_templates"("studio_id", "name", "language");
CREATE INDEX "whatsapp_templates_studio_id_idx" ON "whatsapp_templates"("studio_id");
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── WhatsAppMessage ──────────────────────────────────────────────────
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "template_id" UUID,
    "to_phone" TEXT NOT NULL,
    "message_type" "WhatsAppMessageType" NOT NULL,
    "body" TEXT,
    "media_url" TEXT,
    "variables" JSONB,
    "context_type" TEXT,
    "context_id" UUID,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'queued',
    "failure_reason" TEXT,
    "provider_message_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "sent_by" UUID,
    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "whatsapp_messages_studio_id_idx" ON "whatsapp_messages"("studio_id");
CREATE INDEX "whatsapp_messages_studio_id_status_idx" ON "whatsapp_messages"("studio_id", "status");
CREATE INDEX "whatsapp_messages_studio_id_to_phone_idx" ON "whatsapp_messages"("studio_id", "to_phone");
CREATE INDEX "whatsapp_messages_provider_message_id_idx" ON "whatsapp_messages"("provider_message_id");
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "whatsapp_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── WhatsAppOptStatus ────────────────────────────────────────────────
CREATE TABLE "whatsapp_opt_statuses" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "WhatsAppOptInStatus" NOT NULL DEFAULT 'unknown',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_opt_statuses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_opt_statuses_studio_id_phone_key" ON "whatsapp_opt_statuses"("studio_id", "phone");
CREATE INDEX "whatsapp_opt_statuses_studio_id_idx" ON "whatsapp_opt_statuses"("studio_id");
ALTER TABLE "whatsapp_opt_statuses" ADD CONSTRAINT "whatsapp_opt_statuses_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
