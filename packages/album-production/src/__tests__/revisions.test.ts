import { describe, expect, it } from "vitest";
import { hasReachedRevisionLimit, resolveNextRoundNumber } from "../revisions";

describe("hasReachedRevisionLimit", () => {
  it("never reaches the limit when unlimited", () => {
    expect(hasReachedRevisionLimit({ revisionLimit: null }, 100)).toBe(false);
  });

  it("reaches the limit once rounds requested equal the limit", () => {
    expect(hasReachedRevisionLimit({ revisionLimit: 3 }, 3)).toBe(true);
  });

  it("has not reached the limit while under it", () => {
    expect(hasReachedRevisionLimit({ revisionLimit: 3 }, 2)).toBe(false);
  });
});

describe("resolveNextRoundNumber", () => {
  it("is 1 for the first round", () => {
    expect(resolveNextRoundNumber(0)).toBe(1);
  });
});
