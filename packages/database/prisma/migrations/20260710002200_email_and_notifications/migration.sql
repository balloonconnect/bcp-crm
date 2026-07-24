-- Email & notifications (Prompt 25): per-studio email provider config
-- (platform SMTP/studio SMTP/SES/Resend), an HTML template registry,
-- a full outbound email log with delivery/bounce tracking, per-address
-- unsubscribe, per-user notification channel preferences, and Web Push
-- subscription storage. Also replaces Notification.channel's "sms"
-- value with "browser_push"/"pwa_push" and adds retry/failure tracking
-- to Notification itself. Additive on top of 20260710002100.

-- ── Notification: replace channel enum value, add retry/failure cols ─
-- No existing rows use "sms" (Notification wasn't in production use
-- yet), so the enum values can be swapped directly rather than needing
-- a data migration.
ALTER TYPE "NotificationChannel" ADD VALUE 'browser_push';
ALTER TYPE "NotificationChannel" ADD VALUE 'pwa_push';

ALTER TABLE "notifications"
  ADD COLUMN "failure_reason" TEXT,
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "EmailProvider" AS ENUM ('platform_smtp', 'studio_smtp', 'ses', 'resend');
CREATE TYPE "EmailMessageStatus" AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'failed');

-- ── EmailConfig ──────────────────────────────────────────────────────
CREATE TABLE "email_configs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'platform_smtp',
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_user" TEXT,
    "smtp_password" TEXT,
    "ses_access_key_id" TEXT,
    "ses_secret_access_key" TEXT,
    "ses_region" TEXT,
    "resend_api_key" TEXT,
    "from_address" TEXT,
    "from_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_configs_studio_id_key" ON "email_configs"("studio_id");
ALTER TABLE "email_configs" ADD CONSTRAINT "email_configs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── EmailTemplate ────────────────────────────────────────────────────
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "config_id" UUID,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "variables" TEXT[] NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_templates_studio_id_name_key" ON "email_templates"("studio_id", "name");
CREATE INDEX "email_templates_studio_id_idx" ON "email_templates"("studio_id");
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "email_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── EmailMessage ─────────────────────────────────────────────────────
CREATE TABLE "email_messages" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "template_id" UUID,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "variables" JSONB,
    "attachment_keys" TEXT[] NOT NULL DEFAULT '{}',
    "context_type" TEXT,
    "context_id" UUID,
    "status" "EmailMessageStatus" NOT NULL DEFAULT 'queued',
    "failure_reason" TEXT,
    "provider_message_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "sent_by" UUID,
    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_messages_studio_id_idx" ON "email_messages"("studio_id");
CREATE INDEX "email_messages_studio_id_status_idx" ON "email_messages"("studio_id", "status");
CREATE INDEX "email_messages_studio_id_to_address_idx" ON "email_messages"("studio_id", "to_address");
CREATE INDEX "email_messages_provider_message_id_idx" ON "email_messages"("provider_message_id");
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── EmailUnsubscribe ─────────────────────────────────────────────────
CREATE TABLE "email_unsubscribes" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_unsubscribes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_unsubscribes_studio_id_email_key" ON "email_unsubscribes"("studio_id", "email");
CREATE INDEX "email_unsubscribes_studio_id_idx" ON "email_unsubscribes"("studio_id");
ALTER TABLE "email_unsubscribes" ADD CONSTRAINT "email_unsubscribes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── NotificationPreference ───────────────────────────────────────────
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "browser_push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pwa_push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_studio_user_id_key" ON "notification_preferences"("studio_user_id");
CREATE INDEX "notification_preferences_studio_id_idx" ON "notification_preferences"("studio_id");
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PushSubscription ─────────────────────────────────────────────────
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh_key" TEXT NOT NULL,
    "auth_key" TEXT NOT NULL,
    "user_agent" TEXT,
    "is_pwa" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_studio_id_idx" ON "push_subscriptions"("studio_id");
CREATE INDEX "push_subscriptions_studio_user_id_idx" ON "push_subscriptions"("studio_user_id");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
