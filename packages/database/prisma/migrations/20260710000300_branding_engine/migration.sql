-- White-label branding engine: expands studio_brands to the full field
-- set, adds branch-level overrides (branch_brands) and theme version
-- history (studio_brand_versions). Additive migration on top of
-- 20260710000200_auth_extensions.

-- ── Expand studio_brands ────────────────────────────────────────────────
ALTER TABLE "studio_brands" ADD COLUMN "display_name" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "legal_business_name" TEXT;

ALTER TABLE "studio_brands" ADD COLUMN "logo_light_url" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "logo_dark_url" TEXT;

ALTER TABLE "studio_brands" ADD COLUMN "secondary_color" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "background_color" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "text_color" TEXT;

ALTER TABLE "studio_brands" ADD COLUMN "font_family_body" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "font_family_heading" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "border_radius" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "studio_brands" ADD COLUMN "button_style" TEXT NOT NULL DEFAULT 'solid';
ALTER TABLE "studio_brands" ADD COLUMN "card_style" TEXT NOT NULL DEFAULT 'elevated';

ALTER TABLE "studio_brands" ADD COLUMN "login_background_url" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "email_header_image_url" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "email_header_html" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "email_footer_html" TEXT;

ALTER TABLE "studio_brands" ADD COLUMN "watermark_url" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "watermark_opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "studio_brands" ADD COLUMN "watermark_position" TEXT NOT NULL DEFAULT 'bottom_right';

ALTER TABLE "studio_brands" ADD COLUMN "invoice_design" JSONB;
ALTER TABLE "studio_brands" ADD COLUMN "gallery_theme" JSONB;
ALTER TABLE "studio_brands" ADD COLUMN "client_portal_theme" JSONB;

ALTER TABLE "studio_brands" ADD COLUMN "copyright_text" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "support_email" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "whatsapp_number" TEXT;
ALTER TABLE "studio_brands" ADD COLUMN "social_links" JSONB;

ALTER TABLE "studio_brands" ADD COLUMN "powered_by_visible" BOOLEAN NOT NULL DEFAULT true;

-- ── Branch-level theme override ─────────────────────────────────────────
CREATE TABLE "branch_brands" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "branch_brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_brands_branch_id_key" ON "branch_brands"("branch_id");
CREATE INDEX "branch_brands_studio_id_idx" ON "branch_brands"("studio_id");

ALTER TABLE "branch_brands" ADD CONSTRAINT "branch_brands_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_brands" ADD CONSTRAINT "branch_brands_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "studio_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Theme version history ───────────────────────────────────────────────
CREATE TABLE "studio_brand_versions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "studio_brand_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_brand_versions_studio_id_version_key" ON "studio_brand_versions"("studio_id", "version");
CREATE INDEX "studio_brand_versions_studio_id_idx" ON "studio_brand_versions"("studio_id");

ALTER TABLE "studio_brand_versions" ADD CONSTRAINT "studio_brand_versions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
