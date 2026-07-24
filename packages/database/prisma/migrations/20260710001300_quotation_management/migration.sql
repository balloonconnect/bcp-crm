-- Quotation management (Prompt 16): full quotation lifecycle — line
-- items snapshotted from the catalog, discounts, public share link with
-- OTP-gated access, view tracking, digital approval, and revision
-- history. Additive on top of 20260710001200.

-- QuotationStatus gains two new stages; existing values are untouched,
-- so no data remap is needed here (unlike LeadStatus in
-- 20260710000900, which replaced values rather than only adding some).
ALTER TYPE "QuotationStatus" ADD VALUE 'viewed';
ALTER TYPE "QuotationStatus" ADD VALUE 'converted';

CREATE TYPE "QuotationDiscountType" AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE "QuotationLineItemKind" AS ENUM ('service', 'add_on');
CREATE TYPE "QuotationApprovalAction" AS ENUM ('accepted', 'rejected');

-- ── Quotation: new columns ───────────────────────────────────────────
ALTER TABLE "quotations"
  ADD COLUMN "branch_id" UUID,
  ADD COLUMN "package_id" UUID,
  ADD COLUMN "discount_type" "QuotationDiscountType",
  ADD COLUMN "discount_value" DOUBLE PRECISION,
  ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "gst_rate_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "internal_cost" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "item_level_pricing_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "terms_text" TEXT,
  ADD COLUMN "public_token" TEXT,
  ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_viewed_at" TIMESTAMP(3),
  ADD COLUMN "responded_at" TIMESTAMP(3),
  ADD COLUMN "converted_at" TIMESTAMP(3);

-- Backfill a public_token for any pre-existing rows before enforcing NOT NULL + uniqueness.
UPDATE "quotations" SET "public_token" = gen_random_uuid()::text WHERE "public_token" IS NULL;
ALTER TABLE "quotations" ALTER COLUMN "public_token" SET NOT NULL;
CREATE UNIQUE INDEX "quotations_public_token_key" ON "quotations"("public_token");

CREATE INDEX "quotations_studio_id_valid_until_idx" ON "quotations"("studio_id", "valid_until");

ALTER TABLE "quotations" ADD CONSTRAINT "quotations_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── QuotationLineItem ────────────────────────────────────────────────
CREATE TABLE "quotation_line_items" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "kind" "QuotationLineItemKind" NOT NULL DEFAULT 'service',
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "internal_price" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quotation_line_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quotation_line_items_quotation_id_idx" ON "quotation_line_items"("quotation_id");
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── QuotationPaymentScheduleItem ─────────────────────────────────────
CREATE TABLE "quotation_payment_schedule_items" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "trigger" "PaymentScheduleTrigger" NOT NULL DEFAULT 'on_booking',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quotation_payment_schedule_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quotation_payment_schedule_items_quotation_id_idx" ON "quotation_payment_schedule_items"("quotation_id");
ALTER TABLE "quotation_payment_schedule_items" ADD CONSTRAINT "quotation_payment_schedule_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── QuotationRevision ────────────────────────────────────────────────
CREATE TABLE "quotation_revisions" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "quotation_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quotation_revisions_quotation_id_revision_number_key" ON "quotation_revisions"("quotation_id", "revision_number");
CREATE INDEX "quotation_revisions_studio_id_idx" ON "quotation_revisions"("studio_id");
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── QuotationView ────────────────────────────────────────────────────
CREATE TABLE "quotation_views" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "quotation_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quotation_views_quotation_id_idx" ON "quotation_views"("quotation_id");
CREATE INDEX "quotation_views_studio_id_idx" ON "quotation_views"("studio_id");
ALTER TABLE "quotation_views" ADD CONSTRAINT "quotation_views_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_views" ADD CONSTRAINT "quotation_views_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── QuotationApproval ────────────────────────────────────────────────
CREATE TABLE "quotation_approvals" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "action" "QuotationApprovalAction" NOT NULL,
    "signed_by_name" TEXT,
    "rejection_reason" TEXT,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotation_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quotation_approvals_quotation_id_idx" ON "quotation_approvals"("quotation_id");
CREATE INDEX "quotation_approvals_studio_id_idx" ON "quotation_approvals"("studio_id");
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── QuotationAccessCode ──────────────────────────────────────────────
CREATE TABLE "quotation_access_codes" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "request_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotation_access_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quotation_access_codes_quotation_id_idx" ON "quotation_access_codes"("quotation_id");
ALTER TABLE "quotation_access_codes" ADD CONSTRAINT "quotation_access_codes_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
