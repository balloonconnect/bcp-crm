-- Subscription & licensing: consolidates SubscriptionPlan's four typed
-- limit columns into a single structured `limits` JSON covering all 16
-- plan-limit dimensions, adds license grace periods + allowed-domain
-- restriction, and richer activation device metadata. Additive/replacing
-- on top of 20260710000500_platform_admin.

-- ── SubscriptionPlan: typed limit columns → structured JSON ────────────
ALTER TABLE "subscription_plans" ADD COLUMN "limits" JSONB NOT NULL DEFAULT '{}';

-- Backfill: fold the four existing typed columns into the new JSON shape
-- before dropping them, so no plan silently loses its configured limits.
UPDATE "subscription_plans" SET "limits" = jsonb_build_object(
  'maxUsers', "max_users",
  'maxBranches', "max_branches",
  'maxStorageGb', "max_storage_gb",
  'maxEvents', "max_bookings_per_month"
);

ALTER TABLE "subscription_plans" DROP COLUMN "max_users";
ALTER TABLE "subscription_plans" DROP COLUMN "max_branches";
ALTER TABLE "subscription_plans" DROP COLUMN "max_storage_gb";
ALTER TABLE "subscription_plans" DROP COLUMN "max_bookings_per_month";

-- ── LicenseKey: grace period + allowed-domain restriction ───────────────
ALTER TYPE "LicenseStatus" ADD VALUE 'grace';

ALTER TABLE "license_keys" ADD COLUMN "grace_ends_at" TIMESTAMP(3);
ALTER TABLE "license_keys" ADD COLUMN "allowed_domains" TEXT[] NOT NULL DEFAULT '{}';

-- ── Activation: richer device metadata ───────────────────────────────────
ALTER TABLE "activations" ADD COLUMN "device_metadata" JSONB;
