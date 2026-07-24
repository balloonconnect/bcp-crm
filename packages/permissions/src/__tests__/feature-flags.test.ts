import { describe, expect, it } from "vitest";
import { resolveFeatureFlag, assertFeatureEnabled, FeatureNotEnabledError } from "../feature-flags";

describe("resolveFeatureFlag", () => {
  it("prefers the studio override over everything else", () => {
    expect(
      resolveFeatureFlag({
        studioOverride: { enabled: true },
        globalDefault: { enabled: false },
        planDefault: false,
      }),
    ).toBe(true);
  });

  it("falls back to the global default when there is no override", () => {
    expect(resolveFeatureFlag({ globalDefault: { enabled: true }, planDefault: false })).toBe(true);
  });

  it("falls back to the plan default when there is no flag row at all", () => {
    expect(resolveFeatureFlag({ planDefault: true })).toBe(true);
  });

  it("defaults to false when nothing resolves", () => {
    expect(resolveFeatureFlag({})).toBe(false);
  });
});

describe("assertFeatureEnabled", () => {
  it("throws FeatureNotEnabledError when resolved is false", () => {
    expect(() => assertFeatureEnabled("ai_tools", false)).toThrow(FeatureNotEnabledError);
  });

  it("does not throw when resolved is true", () => {
    expect(() => assertFeatureEnabled("ai_tools", true)).not.toThrow();
  });
});
