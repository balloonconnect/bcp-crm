-- BCP Studio OS — initial schema
-- Hand-authored to exactly match prisma/schema.prisma (see docs/database-conventions.md
-- for why: this environment cannot reach binaries.prisma.sh to run `prisma migrate dev`
-- directly. Regenerate/verify with `pnpm db:generate` + `prisma migrate diff` the first
-- time this runs somewhere with normal network access.)

-- ═══════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TYPE "StudioStatus" AS ENUM ('trial', 'active', 'grace', 'suspended', 'expired', 'cancelled');
CREATE TYPE "PlatformUserStatus" AS ENUM ('invited', 'active', 'suspended', 'deactivated');
CREATE TYPE "StudioUserStatus" AS ENUM ('invited', 'active', 'suspended', 'deactivated');
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'grace', 'past_due', 'suspended', 'expired', 'cancelled');
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');
CREATE TYPE "LicenseStatus" AS ENUM ('active', 'suspended', 'expired', 'revoked');
CREATE TYPE "ActivationStatus" AS ENUM ('active', 'deactivated');
CREATE TYPE "ActorType" AS ENUM ('platform_user', 'studio_user', 'api_key', 'system');
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'whatsapp', 'sms');
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'retrying', 'cancelled');

-- ═══════════════════════════════════════════════════════════════════════
-- PLATFORM
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "platform_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'invited',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");
CREATE INDEX "platform_users_status_idx" ON "platform_users"("status");
CREATE INDEX "platform_users_deleted_at_idx" ON "platform_users"("deleted_at");

CREATE TABLE "platform_permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_permissions_key_key" ON "platform_permissions"("key");
CREATE INDEX "platform_permissions_category_idx" ON "platform_permissions"("category");

CREATE TABLE "platform_roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_roles_key_key" ON "platform_roles"("key");

CREATE TABLE "platform_user_roles" (
    "id" UUID NOT NULL,
    "platform_user_id" UUID NOT NULL,
    "platform_role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "platform_user_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_user_roles_platform_user_id_platform_role_id_key" ON "platform_user_roles"("platform_user_id", "platform_role_id");
CREATE INDEX "platform_user_roles_platform_role_id_idx" ON "platform_user_roles"("platform_role_id");

-- ═══════════════════════════════════════════════════════════════════════
-- STUDIO — core tenant tables
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "studios" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "StudioStatus" NOT NULL DEFAULT 'trial',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "country" TEXT NOT NULL DEFAULT 'IN',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "trial_ends_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studios_slug_key" ON "studios"("slug");
CREATE INDEX "studios_status_idx" ON "studios"("status");
CREATE INDEX "studios_deleted_at_idx" ON "studios"("deleted_at");

CREATE TABLE "studio_brands" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#14161A',
    "accent_color" TEXT NOT NULL DEFAULT '#E8A33D',
    "email_from_name" TEXT,
    "email_from_address" TEXT,
    "whatsapp_display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "studio_brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_brands_studio_id_key" ON "studio_brands"("studio_id");

CREATE TABLE "studio_domains" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verification_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_domains_domain_key" ON "studio_domains"("domain");
CREATE INDEX "studio_domains_studio_id_idx" ON "studio_domains"("studio_id");

CREATE TABLE "studio_branches" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studio_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_branches_studio_id_code_key" ON "studio_branches"("studio_id", "code");
CREATE INDEX "studio_branches_studio_id_idx" ON "studio_branches"("studio_id");
CREATE INDEX "studio_branches_studio_id_is_active_idx" ON "studio_branches"("studio_id", "is_active");

CREATE TABLE "studio_settings" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "studio_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_settings_studio_id_key_key" ON "studio_settings"("studio_id", "key");
CREATE INDEX "studio_settings_studio_id_idx" ON "studio_settings"("studio_id");

-- ═══════════════════════════════════════════════════════════════════════
-- STUDIO — identity, RBAC, invitations
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "studio_users" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "status" "StudioUserStatus" NOT NULL DEFAULT 'invited',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studio_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_users_studio_id_email_key" ON "studio_users"("studio_id", "email");
CREATE INDEX "studio_users_studio_id_idx" ON "studio_users"("studio_id");
CREATE INDEX "studio_users_studio_id_branch_id_idx" ON "studio_users"("studio_id", "branch_id");
CREATE INDEX "studio_users_studio_id_status_idx" ON "studio_users"("studio_id", "status");
CREATE INDEX "studio_users_deleted_at_idx" ON "studio_users"("deleted_at");

CREATE TABLE "studio_permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_permissions_key_key" ON "studio_permissions"("key");
CREATE INDEX "studio_permissions_category_idx" ON "studio_permissions"("category");

CREATE TABLE "studio_roles" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "studio_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_roles_studio_id_key_key" ON "studio_roles"("studio_id", "key");
CREATE INDEX "studio_roles_studio_id_idx" ON "studio_roles"("studio_id");

CREATE TABLE "studio_user_roles" (
    "id" UUID NOT NULL,
    "studio_user_id" UUID NOT NULL,
    "studio_role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "studio_user_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_user_roles_studio_user_id_studio_role_id_key" ON "studio_user_roles"("studio_user_id", "studio_role_id");
CREATE INDEX "studio_user_roles_studio_role_id_idx" ON "studio_user_roles"("studio_role_id");

CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "branch_id" UUID,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "invited_by" UUID NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_studio_id_idx" ON "invitations"("studio_id");
CREATE INDEX "invitations_studio_id_email_idx" ON "invitations"("studio_id", "email");
CREATE INDEX "invitations_studio_id_status_idx" ON "invitations"("studio_id", "status");

-- ═══════════════════════════════════════════════════════════════════════
-- BILLING, LICENSING & LIMITS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" INTEGER NOT NULL,
    "price_yearly" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "max_users" INTEGER,
    "max_branches" INTEGER,
    "max_storage_gb" INTEGER,
    "max_bookings_per_month" INTEGER,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_key_key" ON "subscription_plans"("key");

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'yearly',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscriptions_studio_id_idx" ON "subscriptions"("studio_id");
CREATE INDEX "subscriptions_studio_id_status_idx" ON "subscriptions"("studio_id", "status");

CREATE TABLE "license_keys" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "subscription_id" UUID,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'active',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "seats_allowed" INTEGER NOT NULL DEFAULT 1,
    "max_activations" INTEGER NOT NULL DEFAULT 1,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "license_keys_key_key" ON "license_keys"("key");
CREATE INDEX "license_keys_studio_id_idx" ON "license_keys"("studio_id");
CREATE INDEX "license_keys_studio_id_status_idx" ON "license_keys"("studio_id", "status");
CREATE INDEX "license_keys_expires_at_idx" ON "license_keys"("expires_at");

CREATE TABLE "activations" (
    "id" UUID NOT NULL,
    "license_key_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "hostname" TEXT,
    "ip_address" TEXT,
    "status" "ActivationStatus" NOT NULL DEFAULT 'active',
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "activations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activations_studio_id_idx" ON "activations"("studio_id");
CREATE INDEX "activations_license_key_id_idx" ON "activations"("license_key_id");
CREATE INDEX "activations_license_key_id_fingerprint_idx" ON "activations"("license_key_id", "fingerprint");

CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "usage_records_studio_id_idx" ON "usage_records"("studio_id");
CREATE INDEX "usage_records_studio_id_metric_period_start_idx" ON "usage_records"("studio_id", "metric", "period_start");

CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_flags_studio_id_idx" ON "feature_flags"("studio_id");
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- ═══════════════════════════════════════════════════════════════════════
-- AUDIT, SESSIONS & OPERATIONS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_studio_id_idx" ON "audit_logs"("studio_id");
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX "audit_logs_actor_type_actor_id_idx" ON "audit_logs"("actor_type", "actor_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE TABLE "login_history" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_history_studio_id_idx" ON "login_history"("studio_id");
CREATE INDEX "login_history_actor_type_actor_id_idx" ON "login_history"("actor_type", "actor_id");
CREATE INDEX "login_history_created_at_idx" ON "login_history"("created_at");

CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");
CREATE INDEX "sessions_studio_id_idx" ON "sessions"("studio_id");
CREATE INDEX "sessions_actor_type_actor_id_idx" ON "sessions"("actor_type", "actor_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "hashed_key" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_keys_hashed_key_key" ON "api_keys"("hashed_key");
CREATE INDEX "api_keys_studio_id_idx" ON "api_keys"("studio_id");

CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "last_status_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_endpoints_studio_id_idx" ON "webhook_endpoints"("studio_id");
CREATE INDEX "webhook_endpoints_studio_id_is_active_idx" ON "webhook_endpoints"("studio_id", "is_active");

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_studio_id_idx" ON "notifications"("studio_id");
CREATE INDEX "notifications_recipient_user_id_status_idx" ON "notifications"("recipient_user_id", "status");
CREATE INDEX "notifications_recipient_user_id_read_at_idx" ON "notifications"("recipient_user_id", "read_at");

CREATE TABLE "job_records" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "queue" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_records_studio_id_idx" ON "job_records"("studio_id");
CREATE INDEX "job_records_queue_status_idx" ON "job_records"("queue", "status");
CREATE INDEX "job_records_status_created_at_idx" ON "job_records"("status", "created_at");

-- ═══════════════════════════════════════════════════════════════════════
-- FOREIGN KEYS
-- ═══════════════════════════════════════════════════════════════════════

-- Platform
ALTER TABLE "platform_user_roles" ADD CONSTRAINT "platform_user_roles_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_user_roles" ADD CONSTRAINT "platform_user_roles_platform_role_id_fkey" FOREIGN KEY ("platform_role_id") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Studio core
ALTER TABLE "studio_brands" ADD CONSTRAINT "studio_brands_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_domains" ADD CONSTRAINT "studio_domains_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_branches" ADD CONSTRAINT "studio_branches_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_settings" ADD CONSTRAINT "studio_settings_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Studio identity & RBAC
ALTER TABLE "studio_users" ADD CONSTRAINT "studio_users_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_users" ADD CONSTRAINT "studio_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "studio_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_roles" ADD CONSTRAINT "studio_roles_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_user_roles" ADD CONSTRAINT "studio_user_roles_studio_user_id_fkey" FOREIGN KEY ("studio_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_user_roles" ADD CONSTRAINT "studio_user_roles_studio_role_id_fkey" FOREIGN KEY ("studio_role_id") REFERENCES "studio_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "studio_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Billing & licensing
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activations" ADD CONSTRAINT "activations_license_key_id_fkey" FOREIGN KEY ("license_key_id") REFERENCES "license_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activations" ADD CONSTRAINT "activations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit, sessions & operations
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "studio_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_records" ADD CONSTRAINT "job_records_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
