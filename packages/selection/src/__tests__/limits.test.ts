import { describe, expect, it } from "vitest";
import { checkSelectionLimit, checkCategoryLimit } from "../limits";

describe("checkSelectionLimit", () => {
  it("allows selection under the limit", () => {
    const result = checkSelectionLimit(5, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("blocks once the overall limit is reached", () => {
    expect(checkSelectionLimit(10, 10)).toEqual({ allowed: false, reason: "overall_limit_reached", remaining: 0 });
  });

  it("treats a null limit as unlimited", () => {
    expect(checkSelectionLimit(1000, null).allowed).toBe(true);
  });
});

describe("checkCategoryLimit", () => {
  it("blocks once a category limit is reached", () => {
    expect(checkCategoryLimit(5, 5)).toEqual({ allowed: false, reason: "category_limit_reached", remaining: 0 });
  });

  it("allows a category under its own limit", () => {
    expect(checkCategoryLimit(2, 5).allowed).toBe(true);
  });
});
