-- Studio onboarding wizard: tracks progress through the 20-step guided
-- setup flow, and a minimal Client model for the "Customer import" step
-- (also closes the maxClients plan-limit dimension left reserved in
-- 20260710000600_subscription_licensing). Additive on top of that
-- migration.

CREATE TYPE "OnboardingStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TABLE "onboarding_sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "owner_email" TEXT NOT NULL,
    "resume_token" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'in_progress',
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "completed_steps" TEXT[] NOT NULL DEFAULT '{}',
    "skipped_steps" TEXT[] NOT NULL DEFAULT '{}',
    "step_data" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_sessions_resume_token_key" ON "onboarding_sessions"("resume_token");
CREATE INDEX "onboarding_sessions_studio_id_idx" ON "onboarding_sessions"("studio_id");
CREATE INDEX "onboarding_sessions_owner_email_idx" ON "onboarding_sessions"("owner_email");

ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clients_studio_id_idx" ON "clients"("studio_id");
CREATE INDEX "clients_studio_id_deleted_at_idx" ON "clients"("studio_id", "deleted_at");

ALTER TABLE "clients" ADD CONSTRAINT "clients_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
