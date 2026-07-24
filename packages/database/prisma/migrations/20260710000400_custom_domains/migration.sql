-- Custom domain management: multi-purpose domains (CRM / client portal /
-- gallery / enquiry form / root website), TXT+CNAME verification with
-- retry tracking, SSL status, and activation. Additive on top of
-- 20260710000300_branding_engine, except for one index replacement noted
-- below.

CREATE TYPE "DomainPurpose" AS ENUM ('studio_crm', 'client_portal', 'gallery', 'enquiry_form', 'root_website');
CREATE TYPE "DomainStatus" AS ENUM ('pending', 'verifying', 'verified', 'active', 'failed', 'suspended');
CREATE TYPE "DomainVerificationMethod" AS ENUM ('txt', 'cname');
CREATE TYPE "DomainSslStatus" AS ENUM ('none', 'pending', 'issued', 'failed', 'expired');

-- studio_domains: new columns
ALTER TABLE "studio_domains" ADD COLUMN "purpose" "DomainPurpose" NOT NULL DEFAULT 'studio_crm';
ALTER TABLE "studio_domains" ADD COLUMN "status" "DomainStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "studio_domains" ADD COLUMN "verification_method" "DomainVerificationMethod" NOT NULL DEFAULT 'txt';
ALTER TABLE "studio_domains" ADD COLUMN "cname_target" TEXT;
ALTER TABLE "studio_domains" ADD COLUMN "verification_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "studio_domains" ADD COLUMN "last_verification_attempt_at" TIMESTAMP(3);
ALTER TABLE "studio_domains" ADD COLUMN "next_retry_at" TIMESTAMP(3);
ALTER TABLE "studio_domains" ADD COLUMN "ssl_status" "DomainSslStatus" NOT NULL DEFAULT 'none';
ALTER TABLE "studio_domains" ADD COLUMN "ssl_issued_at" TIMESTAMP(3);
ALTER TABLE "studio_domains" ADD COLUMN "ssl_expires_at" TIMESTAMP(3);
ALTER TABLE "studio_domains" ADD COLUMN "activated_at" TIMESTAMP(3);
ALTER TABLE "studio_domains" ADD COLUMN "created_by" UUID;
ALTER TABLE "studio_domains" ADD COLUMN "updated_by" UUID;
ALTER TABLE "studio_domains" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Backfill: any domain already marked verified (from the branding-era
-- schema) moves to the 'verified' status so existing data doesn't regress
-- to 'pending' under the new state machine.
UPDATE "studio_domains" SET "status" = 'verified' WHERE "verified_at" IS NOT NULL;

CREATE INDEX "studio_domains_studio_id_purpose_idx" ON "studio_domains"("studio_id", "purpose");
CREATE INDEX "studio_domains_status_idx" ON "studio_domains"("status");
CREATE INDEX "studio_domains_next_retry_at_idx" ON "studio_domains"("next_retry_at");

-- Replace the studio-wide "one primary domain" partial index with one
-- scoped per (studio, purpose) — a studio can now have a primary CRM
-- domain *and* a primary gallery domain at the same time.
DROP INDEX IF EXISTS "studio_domains_studio_id_primary_key";
CREATE UNIQUE INDEX "studio_domains_studio_id_purpose_primary_key" ON "studio_domains"("studio_id", "purpose") WHERE "is_primary" = true;
