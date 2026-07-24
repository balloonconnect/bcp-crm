import { z } from "zod";

const contentTypeEnum = z.enum(["instagram_caption", "reel_script", "hashtags", "facebook_post", "google_business_post", "email_campaign", "whatsapp_campaign", "festival_greeting", "review_request", "referral_campaign", "package_description", "seo_title", "blog_outline"]);
const languageEnum = z.enum(["english", "tamil", "kannada", "telugu", "hindi"]);

export const generateContentSchema = z.object({
  contentType: contentTypeEnum,
  language: languageEnum.default("english"),
  service: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  targetAudience: z.string().max(200).optional(),
  tone: z.string().max(100).optional(),
  offer: z.string().max(300).optional(),
  platform: z.string().max(50).optional(),
});

export const brandVoiceSettingsSchema = z.object({
  toneDescription: z.string().max(1000).optional(),
  keyPhrases: z.array(z.string().max(100)).max(20).optional(),
  avoidPhrases: z.array(z.string().max(100)).max(20).optional(),
});

export const saveBrandExampleSchema = z.object({
  requestId: z.string().uuid().optional(), // when saving directly from a generation result
  contentType: contentTypeEnum.optional(), // required when not sourced from a request (a studio pasting in their own example)
  language: languageEnum.optional(),
  content: z.string().min(1).max(5000).optional(),
});

export const approveRequestSchema = z.object({ isApproved: z.boolean() });
