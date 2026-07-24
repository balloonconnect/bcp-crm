export interface OrderLineItem {
  unitPricePaise: number;
  quantity: number;
}

export function computeSubtotal(items: OrderLineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0);
}

export interface OrderTotalsInput {
  items: OrderLineItem[];
  discountPaise: number;
  shippingPaise: number;
  taxRatePercent: number; // applied to (subtotal - discount) + shipping, matching standard Indian GST-on-shipping treatment
  commissionPercent: number; // platform commission — 0 unless PlatformCommerceSettings has it enabled
}

export interface OrderTotals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  platformCommissionPaise: number;
}

/**
 * The single place an order's totals are computed — subtotal →
 * discount → taxable amount (including shipping) → tax → total, then
 * platform commission computed *on top of*, not subtracted from, the
 * total a client pays. A studio's own revenue is always the total
 * minus commission, never the other way around — commission is what
 * the platform takes from what a studio earns, not an extra charge
 * added to what a client pays.
 */
export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotalPaise = computeSubtotal(input.items);
  const discountPaise = Math.min(input.discountPaise, subtotalPaise);
  const taxableAmount = subtotalPaise - discountPaise + input.shippingPaise;
  const taxPaise = Math.round((taxableAmount * input.taxRatePercent) / 100);
  const totalPaise = taxableAmount + taxPaise;
  const platformCommissionPaise = Math.round((totalPaise * input.commissionPercent) / 100);

  return { subtotalPaise, discountPaise, shippingPaise: input.shippingPaise, taxPaise, totalPaise, platformCommissionPaise };
}
