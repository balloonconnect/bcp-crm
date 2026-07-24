-- AI Marketing Studio (Prompt 37): generated marketing content across
-- 13 content types and 5 languages, a per-studio brand voice profile
-- distinct from visual branding, and a saved-brand-examples mechanism
-- that feeds future generations as few-shot examples. Additive on top
-- of 20260710003300.

CREATE TYPE "MarketingContentType" AS ENUM ('instagram_caption', 'reel_script', 'hashtags', 'facebook_post', 'google_business_post', 'email_campaign', 'whatsapp_campaign', 'festival_greeting', 'review_request', 'referral_campaign', 'package_description', 'seo_title', 'blog_outline');
CREATE TYPE "MarketingLanguage" AS ENUM ('english', 'tamil', 'kannada', 'telugu', 'hindi');

-- ── MarketingBrandVoiceSettings ──────────────────────────────────────
CREATE TABLE "marketing_brand_voice_settings" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "tone_description" TEXT,
    "key_phrases" TEXT[] NOT NULL DEFAULT '{}',
    "avoid_phrases" TEXT[] NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_brand_voice_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketing_brand_voice_settings_studio_id_key" ON "marketing_brand_voice_settings"("studio_id");
ALTER TABLE "marketing_brand_voice_settings" ADD CONSTRAINT "marketing_brand_voice_settings_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── MarketingContentRequest ──────────────────────────────────────────
CREATE TABLE "marketing_content_requests" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "content_type" "MarketingContentType" NOT NULL,
    "language" "MarketingLanguage" NOT NULL DEFAULT 'english',
    "inputs" JSONB NOT NULL,
    "generated_content" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "saved_as_brand_example" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "marketing_content_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "marketing_content_requests_studio_id_idx" ON "marketing_content_requests"("studio_id");
CREATE INDEX "marketing_content_requests_studio_id_content_type_idx" ON "marketing_content_requests"("studio_id", "content_type");
ALTER TABLE "marketing_content_requests" ADD CONSTRAINT "marketing_content_requests_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── BrandVoiceExample ────────────────────────────────────────────────
CREATE TABLE "brand_voice_examples" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "content_type" "MarketingContentType" NOT NULL,
    "language" "MarketingLanguage" NOT NULL DEFAULT 'english',
    "content" TEXT NOT NULL,
    "source_request_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "brand_voice_examples_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brand_voice_examples_source_request_id_key" ON "brand_voice_examples"("source_request_id");
CREATE INDEX "brand_voice_examples_studio_id_idx" ON "brand_voice_examples"("studio_id");
CREATE INDEX "brand_voice_examples_studio_id_content_type_idx" ON "brand_voice_examples"("studio_id", "content_type");
ALTER TABLE "brand_voice_examples" ADD CONSTRAINT "brand_voice_examples_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_voice_examples" ADD CONSTRAINT "brand_voice_examples_source_request_id_fkey" FOREIGN KEY ("source_request_id") REFERENCES "marketing_content_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
