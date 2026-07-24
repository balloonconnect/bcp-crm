export interface QuotationLineItemForPricing {
  quantity: number;
  unitPrice: number; // paise
  internalPrice?: number | null; // paise, services only
}

export interface DiscountInput {
  type: "percentage" | "fixed_amount";
  value: number;
}

export interface QuotationTotals {
  subtotal: number; // paise, before discount/tax
  discountAmount: number; // paise
  taxableAmount: number; // paise, subtotal - discount
  gstAmount: number; // paise
  totalAmount: number; // paise — the customer-facing total
  internalCost: number; // paise — studio-only
}

function resolveDiscountAmount(subtotal: number, discount?: DiscountInput | null): number {
  if (!discount) return 0;
  if (discount.type === "percentage") return Math.round((subtotal * discount.value) / 100);
  return Math.round(discount.value);
}

/**
 * The single place quotation totals are computed — every line item's
 * `unitPrice × quantity` sums to `subtotal`; discount and GST apply on
 * top; `internalCost` sums each service line's own cost basis
 * (`internalPrice`, absent for add-ons since those have no internal
 * cost distinct from their customer price) and is never part of
 * anything customer-facing. Discount is clamped so it can never exceed
 * the subtotal (a negative total would be a real bug, not a valid
 * quote).
 */
export function computeQuotationTotals(lineItems: QuotationLineItemForPricing[], discount: DiscountInput | null | undefined, gstRatePercent: number): QuotationTotals {
  const subtotal = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = Math.min(resolveDiscountAmount(subtotal, discount), subtotal);
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = Math.round((taxableAmount * gstRatePercent) / 100);
  const totalAmount = taxableAmount + gstAmount;
  const internalCost = lineItems.reduce((sum, item) => sum + (item.internalPrice ?? 0) * item.quantity, 0);

  return { subtotal, discountAmount, taxableAmount, gstAmount, totalAmount, internalCost };
}

export interface QuotationMargin {
  internalCost: number;
  totalAmount: number;
  margin: number;
  marginPercent: number;
}

export function computeQuotationMargin(internalCost: number, totalAmount: number): QuotationMargin {
  const margin = totalAmount - internalCost;
  const marginPercent = totalAmount > 0 ? (margin / totalAmount) * 100 : 0;
  return { internalCost, totalAmount, margin, marginPercent };
}
