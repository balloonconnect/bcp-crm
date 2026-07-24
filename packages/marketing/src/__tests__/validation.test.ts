import { describe, expect, it } from "vitest";
import { generateContentSchema, brandVoiceSettingsSchema, saveBrandExampleSchema } from "../validation";

describe("generateContentSchema", () => {
  it("accepts a full set of inputs", () => {
    const result = generateContentSchema.safeParse({ contentType: "reel_script", language: "hindi", service: "Baby photography", city: "Chennai", targetAudience: "new parents", tone: "playful", offer: "free consultation", platform: "Instagram Reels" });
    expect(result.success).toBe(true);
  });

  it("defaults language to english", () => {
    const result = generateContentSchema.parse({ contentType: "hashtags" });
    expect(result.language).toBe("english");
  });

  it("rejects an unknown content type", () => {
    expect(generateContentSchema.safeParse({ contentType: "tiktok_dance" }).success).toBe(false);
  });
});

describe("brandVoiceSettingsSchema", () => {
  it("accepts tone description and phrase lists", () => {
    expect(brandVoiceSettingsSchema.safeParse({ toneDescription: "warm", keyPhrases: ["forever moments"], avoidPhrases: ["cheap"] }).success).toBe(true);
  });
});

describe("saveBrandExampleSchema", () => {
  it("accepts saving from a generation request", () => {
    expect(saveBrandExampleSchema.safeParse({ requestId: "00000000-0000-0000-0000-000000000000" }).success).toBe(true);
  });

  it("accepts a hand-written example", () => {
    expect(saveBrandExampleSchema.safeParse({ contentType: "instagram_caption", language: "english", content: "Our own example caption." }).success).toBe(true);
  });
});
