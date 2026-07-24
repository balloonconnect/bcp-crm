export interface DiscountInput {
  type: "percentage" | "fixed_amount";
  value: number;
}

/** Same discount mechanics as `@bcp/quotations`, kept independent here rather than a cross-package import since invoices compute their own totals from their own fields, not a quotation's. Clamped so a discount can never exceed the subtotal it's applied to. */
export function computeDiscountAmount(subtotal: number, discount?: DiscountInput | null): number {
  if (!discount) return 0;
  const amount = discount.type === "percentage" ? Math.round((subtotal * discount.value) / 100) : Math.round(discount.value);
  return Math.min(amount, subtotal);
}
