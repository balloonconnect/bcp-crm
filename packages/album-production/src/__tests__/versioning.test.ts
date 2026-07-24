import { describe, expect, it } from "vitest";
import { resolveNextVersionNumber } from "../versioning";

describe("resolveNextVersionNumber", () => {
  it("starts at version 1 for a spread with no prior versions", () => {
    expect(resolveNextVersionNumber([], 1)).toBe(1);
  });

  it("increments only for the matching spread number", () => {
    const existing = [{ spreadNumber: 1, versionNumber: 1 }, { spreadNumber: 1, versionNumber: 2 }, { spreadNumber: 2, versionNumber: 1 }];
    expect(resolveNextVersionNumber(existing, 1)).toBe(3);
    expect(resolveNextVersionNumber(existing, 2)).toBe(2);
    expect(resolveNextVersionNumber(existing, 3)).toBe(1);
  });
});
