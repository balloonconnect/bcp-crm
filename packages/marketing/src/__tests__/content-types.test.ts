import { describe, expect, it } from "vitest";
import { MARKETING_CONTENT_TYPES, getContentTypeDefinition } from "../content-types";

describe("MARKETING_CONTENT_TYPES", () => {
  it("has exactly the 13 content types named in the brief", () => {
    expect(MARKETING_CONTENT_TYPES).toHaveLength(13);
    const keys = MARKETING_CONTENT_TYPES.map((t) => t.key);
    expect(keys).toContain("instagram_caption");
    expect(keys).toContain("reel_script");
    expect(keys).toContain("hashtags");
    expect(keys).toContain("facebook_post");
    expect(keys).toContain("google_business_post");
    expect(keys).toContain("email_campaign");
    expect(keys).toContain("whatsapp_campaign");
    expect(keys).toContain("festival_greeting");
    expect(keys).toContain("review_request");
    expect(keys).toContain("referral_campaign");
    expect(keys).toContain("package_description");
    expect(keys).toContain("seo_title");
    expect(keys).toContain("blog_outline");
  });

  it("every content type has non-empty guidance", () => {
    for (const type of MARKETING_CONTENT_TYPES) expect(type.guidance.length).toBeGreaterThan(0);
  });
});

describe("getContentTypeDefinition", () => {
  it("finds a type by key", () => {
    expect(getContentTypeDefinition("hashtags")?.label).toBe("Hashtags");
  });

  it("returns undefined for an unknown type", () => {
    expect(getContentTypeDefinition("tiktok_dance")).toBeUndefined();
  });
});
