import { describe, expect, it } from "vitest";
import { parseUtmParams } from "../utm";
import { buildPublicFormUrl, buildEmbedCode } from "../links";

describe("parseUtmParams", () => {
  it("extracts all 5 standard UTM params", () => {
    const params = new URLSearchParams("utm_source=instagram&utm_medium=social&utm_campaign=spring&utm_term=wedding&utm_content=story");
    expect(parseUtmParams(params)).toEqual({ source: "instagram", medium: "social", campaign: "spring", term: "wedding", content: "story" });
  });

  it("omits params that aren't present", () => {
    const params = new URLSearchParams("utm_source=instagram");
    expect(parseUtmParams(params)).toEqual({ source: "instagram" });
  });

  it("returns an empty object with no UTM params", () => {
    expect(parseUtmParams(new URLSearchParams())).toEqual({});
  });
});

describe("buildPublicFormUrl / buildEmbedCode", () => {
  it("builds a URL keyed by studio slug and form slug", () => {
    expect(buildPublicFormUrl("https://app.bcpstudio.app", "balloon-connect", "wedding-enquiries")).toBe(
      "https://app.bcpstudio.app/enquire/balloon-connect/wedding-enquiries",
    );
  });

  it("strips a trailing slash from the base URL", () => {
    expect(buildPublicFormUrl("https://app.bcpstudio.app/", "studio", "form")).toBe("https://app.bcpstudio.app/enquire/studio/form");
  });

  it("builds an iframe embed snippet containing the URL", () => {
    const embed = buildEmbedCode("https://app.bcpstudio.app/enquire/studio/form");
    expect(embed).toContain("<iframe");
    expect(embed).toContain("https://app.bcpstudio.app/enquire/studio/form");
  });
});
