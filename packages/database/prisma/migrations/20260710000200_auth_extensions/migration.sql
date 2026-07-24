-- Authentication support: email verification, Google OAuth linking, 2FA,
-- account lockout, and the two supporting tables (VerificationToken,
-- RecoveryCode) that back OTP/verification/reset flows and 2FA backup
-- codes. Additive migration on top of 20260710000000_init.

CREATE TYPE "VerificationPurpose" AS ENUM ('email_verification', 'password_reset', 'login_otp');

-- PlatformUser: password becomes optional (Google-only accounts), plus
-- verification/OAuth/2FA/lockout columns.
ALTER TABLE "platform_users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "platform_users" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "platform_users" ADD COLUMN "google_subject" TEXT;
ALTER TABLE "platform_users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "platform_users" ADD COLUMN "two_factor_secret" TEXT;
ALTER TABLE "platform_users" ADD COLUMN "two_factor_enabled_at" TIMESTAMP(3);
ALTER TABLE "platform_users" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "platform_users" ADD COLUMN "locked_until" TIMESTAMP(3);

CREATE UNIQUE INDEX "platform_users_google_subject_key" ON "platform_users"("google_subject");

-- StudioUser: same set of columns, scoped per studio.
ALTER TABLE "studio_users" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "studio_users" ADD COLUMN "google_subject" TEXT;
ALTER TABLE "studio_users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "studio_users" ADD COLUMN "two_factor_secret" TEXT;
ALTER TABLE "studio_users" ADD COLUMN "two_factor_enabled_at" TIMESTAMP(3);
ALTER TABLE "studio_users" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "studio_users" ADD COLUMN "locked_until" TIMESTAMP(3);

CREATE UNIQUE INDEX "studio_users_studio_id_google_subject_key" ON "studio_users"("studio_id", "google_subject");

-- VerificationToken: email verification / password reset / login OTP.
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "request_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");
CREATE INDEX "verification_tokens_studio_id_idx" ON "verification_tokens"("studio_id");
CREATE INDEX "verification_tokens_actor_type_actor_id_purpose_idx" ON "verification_tokens"("actor_type", "actor_id", "purpose");
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RecoveryCode: 2FA backup codes.
CREATE TABLE "recovery_codes" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recovery_codes_code_hash_key" ON "recovery_codes"("code_hash");
CREATE INDEX "recovery_codes_studio_id_idx" ON "recovery_codes"("studio_id");
CREATE INDEX "recovery_codes_actor_type_actor_id_idx" ON "recovery_codes"("actor_type", "actor_id");

ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
