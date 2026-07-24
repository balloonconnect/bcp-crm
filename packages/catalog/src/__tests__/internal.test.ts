import { describe, expect, it } from "vitest";
import { computeInternalPackageCost, computePackageMargin } from "../internal";

describe("computeInternalPackageCost", () => {
  it("sums price × quantity across services", () => {
    const cost = computeInternalPackageCost([
      { internalPriceSnapshot: 800000, quantity: 1 },
      { internalPriceSnapshot: 20000, quantity: 3 },
    ]);
    expect(cost).toBe(860000);
  });

  it("returns 0 for no services", () => {
    expect(computeInternalPackageCost([])).toBe(0);
  });
});

describe("computePackageMargin", () => {
  it("computes margin and marginPercent relative to the customer-facing total", () => {
    const result = computePackageMargin(800000, 1500000);
    expect(result.margin).toBe(700000);
    expect(result.marginPercent).toBeCloseTo(46.67, 1);
  });

  it("returns 0% margin instead of dividing by zero when the total is 0", () => {
    const result = computePackageMargin(0, 0);
    expect(result.marginPercent).toBe(0);
    expect(Number.isFinite(result.marginPercent)).toBe(true);
  });

  it("reports a negative margin when cost exceeds the customer-facing total", () => {
    const result = computePackageMargin(1000000, 800000);
    expect(result.margin).toBeLessThan(0);
  });
});
