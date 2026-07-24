import { describe, expect, it } from "vitest";
import { toMajorUnits, monthlyEquivalent } from "../lib/currency";

describe("toMajorUnits", () => {
  it("converts paise to rupees", () => {
    expect(toMajorUnits(249900)).toBe(2499);
    expect(toMajorUnits(100)).toBe(1);
  });

  it("rounds to 2 decimal places", () => {
    expect(toMajorUnits(1)).toBe(0.01);
    expect(toMajorUnits(333)).toBe(3.33);
  });
});

describe("monthlyEquivalent", () => {
  it("returns the amount unchanged for a monthly billing cycle", () => {
    expect(monthlyEquivalent(249900, "monthly")).toBe(249900);
  });

  it("divides by 12 for a yearly billing cycle", () => {
    expect(monthlyEquivalent(2499900, "yearly")).toBeCloseTo(208325, 0);
  });
});
