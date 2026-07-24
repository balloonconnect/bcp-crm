import { describe, expect, it } from "vitest";
import { nextVersionNumber, diffThemes, applyRollback, buildSnapshot } from "../versioning";
import { PLATFORM_DEFAULT_THEME } from "../platform-default";

describe("nextVersionNumber", () => {
  it("starts at 1 for empty history", () => {
    expect(nextVersionNumber([])).toBe(1);
  });

  it("increments from the highest existing version", () => {
    expect(nextVersionNumber([{ version: 1 }, { version: 3 }, { version: 2 }])).toBe(4);
  });
});

describe("diffThemes", () => {
  it("finds no diffs for identical themes", () => {
    expect(diffThemes({ primaryColor: "#111" }, { primaryColor: "#111" })).toEqual([]);
  });

  it("finds a diff for a changed field", () => {
    const diffs = diffThemes({ primaryColor: "#111" }, { primaryColor: "#222" });
    expect(diffs).toEqual([{ field: "primaryColor", before: "#111", after: "#222" }]);
  });

  it("finds diffs for fields added or removed entirely", () => {
    const diffs = diffThemes({ primaryColor: "#111" }, { primaryColor: "#111", accentColor: "#222" });
    expect(diffs).toEqual([{ field: "accentColor", before: undefined, after: "#222" }]);
  });
});

describe("applyRollback / buildSnapshot", () => {
  it("buildSnapshot captures the current theme as a partial snapshot", () => {
    const snapshot = buildSnapshot(PLATFORM_DEFAULT_THEME);
    expect(snapshot.primaryColor).toBe(PLATFORM_DEFAULT_THEME.primaryColor);
  });

  it("applyRollback returns the target version's snapshot unchanged", () => {
    const record = { version: 2, snapshot: { primaryColor: "#ABCDEF" }, createdAt: new Date() };
    expect(applyRollback(record)).toEqual({ primaryColor: "#ABCDEF" });
  });
});
