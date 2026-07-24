import { describe, expect, it } from "vitest";
import { isGroupPhoto } from "../group-photo";
import { SUGGESTED_MOMENT_TAGS } from "../moments";

describe("isGroupPhoto", () => {
  it("flags 4 or more faces as a group photo", () => {
    expect(isGroupPhoto(4)).toBe(true);
    expect(isGroupPhoto(10)).toBe(true);
  });

  it("does not flag a couple shot as a group photo", () => {
    expect(isGroupPhoto(2)).toBe(false);
  });
});

describe("SUGGESTED_MOMENT_TAGS", () => {
  it("has a non-empty, unique set of suggestions", () => {
    expect(SUGGESTED_MOMENT_TAGS.length).toBeGreaterThan(5);
    expect(new Set(SUGGESTED_MOMENT_TAGS).size).toBe(SUGGESTED_MOMENT_TAGS.length);
  });
});
