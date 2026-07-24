import { describe, expect, it } from "vitest";
import { validateCoupon, computeCouponDiscount } from "../coupons";

const baseCoupon = { discountType: "percentage" as const, discountValue: 10, appliesToCategory: null, maxUses: null, usedCount: 0, validFrom: null, validUntil: null, isActive: true };

describe("validateCoupon", () => {
  it("is valid with no restrictions", () => {
    expect(validateCoupon(baseCoupon, ["print"])).toEqual({ valid: true });
  });

  it("is invalid when inactive", () => {
    expect(validateCoupon({ ...baseCoupon, isActive: false }, ["print"])).toEqual({ valid: false, reason: "inactive" });
  });

  it("is invalid once the usage limit is reached", () => {
    expect(validateCoupon({ ...baseCoupon, maxUses: 5, usedCount: 5 }, ["print"])).toEqual({ valid: false, reason: "usage_limit_reached" });
  });

  it("is invalid when the order doesn't include the required category", () => {
    expect(validateCoupon({ ...baseCoupon, appliesToCategory: "canvas" }, ["print"])).toEqual({ valid: false, reason: "category_mismatch" });
  });

  it("is invalid past its expiry", () => {
    const now = new Date("2026-08-01");
    expect(validateCoupon({ ...baseCoupon, validUntil: new Date("2026-07-01") }, ["print"], now)).toEqual({ valid: false, reason: "expired" });
  });
});

describe("computeCouponDiscount", () => {
  it("computes a percentage discount", () => {
    expect(computeCouponDiscount(100000, { discountType: "percentage", discountValue: 10 })).toBe(10000);
  });

  it("clamps a fixed discount larger than the subtotal", () => {
    expect(computeCouponDiscount(5000, { discountType: "fixed_amount", discountValue: 10000 })).toBe(5000);
  });
});
