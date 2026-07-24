import { describe, expect, it } from "vitest";
import { MARKETING_LANGUAGES, getLanguageLabel } from "../languages";

describe("MARKETING_LANGUAGES", () => {
  it("has exactly the 5 languages named in the brief", () => {
    expect(MARKETING_LANGUAGES.map((l) => l.key)).toEqual(["english", "tamil", "kannada", "telugu", "hindi"]);
  });
});

describe("getLanguageLabel", () => {
  it("returns the display label", () => {
    expect(getLanguageLabel("tamil")).toBe("Tamil");
  });

  it("falls back to the raw key for an unknown language", () => {
    expect(getLanguageLabel("klingon")).toBe("klingon");
  });
});
