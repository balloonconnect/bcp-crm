import { describe, expect, it } from "vitest";
import { themeToCssVariables, cssVariablesToRootBlock, cssVariablesToInlineStyle } from "../css-variables";
import { PLATFORM_DEFAULT_THEME } from "../platform-default";

describe("themeToCssVariables", () => {
  it("produces the core @bcp/ui-compatible variable names", () => {
    const vars = themeToCssVariables(PLATFORM_DEFAULT_THEME);
    for (const key of ["--background", "--foreground", "--primary", "--primary-foreground", "--accent", "--accent-foreground", "--radius", "--font-sans"]) {
      expect(vars).toHaveProperty(key);
    }
  });

  it("expresses colors as HSL triplets, not raw hex", () => {
    const vars = themeToCssVariables(PLATFORM_DEFAULT_THEME);
    expect(vars["--primary"]).toMatch(/^\d+ \d+% \d+%$/);
  });

  it("includes secondary variables only when a secondary color is set", () => {
    const withSecondary = themeToCssVariables({ ...PLATFORM_DEFAULT_THEME, secondaryColor: "#336699" });
    const without = themeToCssVariables({ ...PLATFORM_DEFAULT_THEME, secondaryColor: undefined });
    expect(withSecondary).toHaveProperty("--secondary");
    expect(without).not.toHaveProperty("--secondary");
  });

  it("computes a readable foreground automatically", () => {
    const dark = themeToCssVariables({ ...PLATFORM_DEFAULT_THEME, primaryColor: "#000000" });
    expect(dark["--primary-foreground"]).toBe("0 0% 100%"); // white on black
  });
});

describe("cssVariablesToRootBlock", () => {
  it("wraps variables in a :root block", () => {
    const block = cssVariablesToRootBlock({ "--x": "1" });
    expect(block).toContain(":root {");
    expect(block).toContain("--x: 1;");
  });
});

describe("cssVariablesToInlineStyle", () => {
  it("joins variables as a semicolon-separated inline style", () => {
    expect(cssVariablesToInlineStyle({ "--x": "1", "--y": "2" })).toBe("--x: 1; --y: 2");
  });
});
