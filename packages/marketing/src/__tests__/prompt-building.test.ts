import { describe, expect, it } from "vitest";
import { buildGenerationPrompt } from "../prompt-building";

describe("buildGenerationPrompt", () => {
  it("includes every supplied input", () => {
    const prompt = buildGenerationPrompt("instagram_caption", "english", { service: "Wedding photography", city: "Bengaluru", targetAudience: "engaged couples", tone: "warm", offer: "10% off this month", platform: "Instagram" }, {});
    expect(prompt).toContain("Wedding photography");
    expect(prompt).toContain("Bengaluru");
    expect(prompt).toContain("engaged couples");
    expect(prompt).toContain("warm");
    expect(prompt).toContain("10% off this month");
  });

  it("includes the target language", () => {
    const prompt = buildGenerationPrompt("hashtags", "tamil", {}, {});
    expect(prompt).toContain("Tamil");
  });

  it("includes brand voice tone and phrases when provided", () => {
    const prompt = buildGenerationPrompt("facebook_post", "english", {}, { toneDescription: "warm and playful", keyPhrases: ["forever moments"], avoidPhrases: ["cheap"] });
    expect(prompt).toContain("warm and playful");
    expect(prompt).toContain("forever moments");
    expect(prompt).toContain("cheap");
  });

  it("includes saved brand examples as few-shot material", () => {
    const prompt = buildGenerationPrompt("instagram_caption", "english", {}, { examples: ["Golden hour, golden memories. ✨"] });
    expect(prompt).toContain("Golden hour, golden memories");
    expect(prompt).toContain("Example 1");
  });

  it("throws for an unknown content type", () => {
    expect(() => buildGenerationPrompt("tiktok_dance", "english", {}, {})).toThrow();
  });
});
