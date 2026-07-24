-- Platform Super Admin support: global settings, announcements, and
-- studio support requests. Additive on top of 20260710000400_custom_domains.

CREATE TYPE "AnnouncementSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "SupportRequestStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE "SupportRequestPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'info',
    "audience" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "announcements_is_published_starts_at_idx" ON "announcements"("is_published", "starts_at");

CREATE TABLE "support_requests" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "raised_by" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'open',
    "priority" "SupportRequestPriority" NOT NULL DEFAULT 'medium',
    "assigned_to" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_requests_studio_id_idx" ON "support_requests"("studio_id");
CREATE INDEX "support_requests_status_idx" ON "support_requests"("status");
CREATE INDEX "support_requests_assigned_to_idx" ON "support_requests"("assigned_to");

ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "failure_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payments_studio_id_idx" ON "payments"("studio_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_studio_id_status_idx" ON "payments"("studio_id", "status");

ALTER TABLE "payments" ADD CONSTRAINT "payments_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
