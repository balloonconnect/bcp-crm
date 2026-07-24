export interface CouponForValidation {
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  appliesToCategory: string | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
}

export type CouponValidationResult = { valid: true } | { valid: false; reason: "inactive" | "expired" | "not_yet_valid" | "usage_limit_reached" | "category_mismatch" };

/** Every reason a coupon can fail is checked and reported distinctly — "expired" and "usage limit reached" are different problems a client should see worded differently, not one generic "invalid coupon" message. */
export function validateCoupon(coupon: CouponForValidation, orderCategories: string[], now: Date = new Date()): CouponValidationResult {
  if (!coupon.isActive) return { valid: false, reason: "inactive" };
  if (coupon.validFrom && now.getTime() < coupon.validFrom.getTime()) return { valid: false, reason: "not_yet_valid" };
  if (coupon.validUntil && now.getTime() > coupon.validUntil.getTime()) return { valid: false, reason: "expired" };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { valid: false, reason: "usage_limit_reached" };
  if (coupon.appliesToCategory && !orderCategories.includes(coupon.appliesToCategory)) return { valid: false, reason: "category_mismatch" };
  return { valid: true };
}

/** Clamped so a coupon can never discount an order below zero — a fixed-amount coupon larger than the subtotal just brings the order to free, not negative. */
export function computeCouponDiscount(subtotalPaise: number, coupon: Pick<CouponForValidation, "discountType" | "discountValue">): number {
  const amount = coupon.discountType === "percentage" ? Math.round((subtotalPaise * coupon.discountValue) / 100) : Math.round(coupon.discountValue);
  return Math.min(amount, subtotalPaise);
}
