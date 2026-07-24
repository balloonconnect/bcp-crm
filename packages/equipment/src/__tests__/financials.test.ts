import { describe, expect, it } from "vitest";
import { computeEquipmentValuation } from "../financials";

describe("computeEquipmentValuation", () => {
  it("prefers replacement cost over purchase price per unit", () => {
    const result = computeEquipmentValuation([{ quantity: 2, replacementCost: 100000, purchasePrice: 80000 }]);
    expect(result.totalReplacementValue).toBe(200000);
    expect(result.totalPurchaseValue).toBe(160000);
  });

  it("falls back to purchase price when no replacement cost is set", () => {
    const result = computeEquipmentValuation([{ quantity: 1, replacementCost: null, purchasePrice: 50000 }]);
    expect(result.totalReplacementValue).toBe(50000);
  });

  it("treats missing values as 0 rather than throwing", () => {
    const result = computeEquipmentValuation([{ quantity: 1, replacementCost: null, purchasePrice: null }]);
    expect(result.totalReplacementValue).toBe(0);
    expect(result.totalPurchaseValue).toBe(0);
  });
});
