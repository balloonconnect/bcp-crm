import { describe, expect, it } from "vitest";
import { resolveTheme } from "../resolve-theme";
import { PLATFORM_DEFAULT_THEME } from "../platform-default";

describe("resolveTheme", () => {
  it("returns the platform default when there is no studio or branch override", () => {
    const { theme, sources } = resolveTheme({});
    expect(theme).toEqual(PLATFORM_DEFAULT_THEME);
    expect(sources.primaryColor).toBe("platform");
  });

  it("applies a studio override on top of the platform default", () => {
    const { theme, sources } = resolveTheme({
      studioOverride: { primaryColor: "#FF0000" },
    });
    expect(theme.primaryColor).toBe("#FF0000");
    expect(theme.accentColor).toBe(PLATFORM_DEFAULT_THEME.accentColor); // untouched field falls through
    expect(sources.primaryColor).toBe("studio");
    expect(sources.accentColor).toBe("platform");
  });

  it("applies a branch override on top of the studio override", () => {
    const { theme, sources } = resolveTheme({
      studioOverride: { primaryColor: "#FF0000", accentColor: "#00FF00" },
      branchOverride: { primaryColor: "#0000FF" },
    });
    expect(theme.primaryColor).toBe("#0000FF"); // branch wins
    expect(theme.accentColor).toBe("#00FF00"); // studio value, no branch override for this field
    expect(sources.primaryColor).toBe("branch");
    expect(sources.accentColor).toBe("studio");
  });

  it("branch override alone (no studio override) still layers on the platform default", () => {
    const { theme } = resolveTheme({ branchOverride: { borderRadius: 0 } });
    expect(theme.borderRadius).toBe(0);
    expect(theme.primaryColor).toBe(PLATFORM_DEFAULT_THEME.primaryColor);
  });
});
