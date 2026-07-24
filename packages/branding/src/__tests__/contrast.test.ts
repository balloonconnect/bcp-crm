import { describe, expect, it } from "vitest";
import { contrastRatio, contrastLevel, validateThemeContrast } from "../contrast";
import { PLATFORM_DEFAULT_THEME } from "../platform-default";

describe("contrastRatio", () => {
  it("black on white is the maximum ratio, 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("a color against itself is 1:1", () => {
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#111111", "#EEEEEE")).toBeCloseTo(contrastRatio("#EEEEEE", "#111111"), 5);
  });
});

describe("contrastLevel", () => {
  it("classifies AA at 4.5 and above", () => {
    expect(contrastLevel(4.5)).toBe("AA");
    expect(contrastLevel(7)).toBe("AA");
  });

  it("classifies AA-large between 3 and 4.5", () => {
    expect(contrastLevel(3)).toBe("AA-large");
    expect(contrastLevel(4)).toBe("AA-large");
  });

  it("classifies fail below 3", () => {
    expect(contrastLevel(2.9)).toBe("fail");
  });
});

describe("validateThemeContrast", () => {
  it("passes for the platform default theme with black text on white background", () => {
    const result = validateThemeContrast({
      ...PLATFORM_DEFAULT_THEME,
      backgroundColor: "#FFFFFF",
      textColor: "#14161A",
    });
    const bodyCheck = result.checks.find((c) => c.pair === "body text on background")!;
    expect(bodyCheck.passes).toBe(true);
  });

  it("flags low-contrast body text as a failure", () => {
    const result = validateThemeContrast({
      ...PLATFORM_DEFAULT_THEME,
      backgroundColor: "#FFFFFF",
      textColor: "#F0F0F0", // near-white on white — unreadable
    });
    expect(result.passes).toBe(false);
    expect(result.failures.some((f) => f.pair === "body text on background")).toBe(true);
  });

  it("uses a relaxed 3:1 threshold for non-text brand colors", () => {
    const result = validateThemeContrast({
      ...PLATFORM_DEFAULT_THEME,
      backgroundColor: "#FFFFFF",
      textColor: "#14161A",
      primaryColor: "#9CA3AF", // mid-gray — plausible for a UI accent though not for body text
    });
    const primaryCheck = result.checks.find((c) => c.pair === "primary color on background")!;
    expect(primaryCheck.requiresAA).toBe(false);
  });
});
