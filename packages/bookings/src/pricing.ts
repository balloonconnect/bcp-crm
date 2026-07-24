export interface BookingLineItemForPricing {
  quantity: number;
  unitPrice: number; // paise
  internalPrice?: number | null;
}

export interface BookingCostSummary {
  sellingPrice: number; // paise — sum of unitPrice × quantity across line items
  internalCost: number; // paise — sum of internalPrice × quantity (services only)
  estimatedProfit: number; // paise — sellingPrice - internalCost
  profitMarginPercent: number; // 0-100, relative to sellingPrice
}

/** Same shape of computation as `@bcp/quotations`' totals, but a booking has no discount/GST fields of its own — it inherits the already-settled `totalAmount` from the quotation it was converted from as its `sellingPrice`. This function is for the (less common) case of computing figures from a booking's own line items directly, e.g. after a manual edit. */
export function computeBookingCostSummary(lineItems: BookingLineItemForPricing[]): BookingCostSummary {
  const sellingPrice = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const internalCost = lineItems.reduce((sum, item) => sum + (item.internalPrice ?? 0) * item.quantity, 0);
  const estimatedProfit = sellingPrice - internalCost;
  const profitMarginPercent = sellingPrice > 0 ? (estimatedProfit / sellingPrice) * 100 : 0;
  return { sellingPrice, internalCost, estimatedProfit, profitMarginPercent };
}

export interface PaymentMilestoneForStatus {
  dueDate?: Date | null;
  status: "pending" | "paid" | "overdue";
}

/** A milestone whose due date has passed without being marked paid is overdue — this is the pure check the backend runs to refresh milestone statuses (e.g. on booking read) rather than relying on someone manually flipping a status. */
export function resolveMilestoneStatus(milestone: PaymentMilestoneForStatus, now: Date = new Date()): "pending" | "paid" | "overdue" {
  if (milestone.status === "paid") return "paid";
  if (milestone.dueDate && milestone.dueDate.getTime() < now.getTime()) return "overdue";
  return "pending";
}
