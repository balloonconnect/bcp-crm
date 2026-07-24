export interface MarketingContentTypeDefinition {
  key: string;
  label: string;
  guidance: string; // format/length guidance folded into the generation prompt
  needsPlatform: boolean; // whether "Platform" is a meaningful input for this type (a hashtag set has no single platform; a Facebook post does)
}

/** The 13 content types named in the brief, each with its own format guidance — a caption and a blog outline need entirely different instructions even though both ultimately come from the same generation pipeline. */
export const MARKETING_CONTENT_TYPES: MarketingContentTypeDefinition[] = [
  { key: "instagram_caption", label: "Instagram caption", guidance: "A short, scroll-stopping caption (2-4 sentences) with a natural call-to-action. No hashtags inline — those are generated separately.", needsPlatform: false },
  { key: "reel_script", label: "Reel script", guidance: "A 15-30 second video script with on-screen text cues and a hook in the first 2 seconds. Format as numbered beats.", needsPlatform: false },
  { key: "hashtags", label: "Hashtags", guidance: "A mix of broad, niche, and location-specific hashtags (15-20 total), space-separated, no numbering.", needsPlatform: false },
  { key: "facebook_post", label: "Facebook post", guidance: "A slightly longer, conversational post (3-6 sentences) suited to an older, more local audience than Instagram.", needsPlatform: false },
  { key: "google_business_post", label: "Google Business post", guidance: "A concise update (under 1500 characters) with a clear call-to-action button suggestion (Book, Learn more, Call).", needsPlatform: false },
  { key: "email_campaign", label: "Email campaign", guidance: "A subject line, preview text, and a short body (3 short paragraphs) with one clear call-to-action.", needsPlatform: false },
  { key: "whatsapp_campaign", label: "WhatsApp campaign", guidance: "A short, personal-feeling broadcast message (under 300 characters) — never sounds like mass marketing copy.", needsPlatform: false },
  { key: "festival_greeting", label: "Festival greeting", guidance: "A warm, culturally appropriate greeting tied to the festival named in the offer/context, with a soft business mention, not a hard sell.", needsPlatform: false },
  { key: "review_request", label: "Review request", guidance: "A polite, low-pressure message asking a recent client for a review, with a direct link placeholder.", needsPlatform: false },
  { key: "referral_campaign", label: "Referral campaign", guidance: "A message explaining a referral incentive clearly, for a studio to send to past clients.", needsPlatform: false },
  { key: "package_description", label: "Package description", guidance: "A customer-facing package description (100-150 words) covering what's included, written to sell the experience, not just list deliverables.", needsPlatform: false },
  { key: "seo_title", label: "SEO title", guidance: "3-5 alternative page/post titles, each under 60 characters, with the target city and service naturally included.", needsPlatform: false },
  { key: "blog_outline", label: "Blog outline", guidance: "An H2/H3 outline for a blog post (5-8 sections) with a suggested title, not full prose.", needsPlatform: false },
];

export function getContentTypeDefinition(key: string): MarketingContentTypeDefinition | undefined {
  return MARKETING_CONTENT_TYPES.find((t) => t.key === key);
}
