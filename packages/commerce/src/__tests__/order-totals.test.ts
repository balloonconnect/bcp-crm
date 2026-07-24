import { describe, expect, it } from "vitest";
import { computeSubtotal, computeOrderTotals } from "../order-totals";

describe("computeSubtotal", () => {
  it("sums unit price times quantity across items", () => {
    expect(computeSubtotal([{ unitPricePaise: 1000, quantity: 2 }, { unitPricePaise: 500, quantity: 3 }])).toBe(3500);
  });
});

describe("computeOrderTotals", () => {
  it("composes discount, shipping, and tax in the fixed order", () => {
    const result = computeOrderTotals({ items: [{ unitPricePaise: 100000, quantity: 1 }], discountPaise: 10000, shippingPaise: 5000, taxRatePercent: 18, commissionPercent: 0 });
    expect(result.subtotalPaise).toBe(100000);
    expect(result.discountPaise).toBe(10000);
    // taxable = 100000 - 10000 + 5000 = 95000; tax = 17100; total = 112100
    expect(result.taxPaise).toBe(17100);
    expect(result.totalPaise).toBe(112100);
  });

  it("computes zero platform commission by default", () => {
    const result = computeOrderTotals({ items: [{ unitPricePaise: 100000, quantity: 1 }], discountPaise: 0, shippingPaise: 0, taxRatePercent: 0, commissionPercent: 0 });
    expect(result.platformCommissionPaise).toBe(0);
  });

  it("computes commission on top of the total when configured", () => {
    const result = computeOrderTotals({ items: [{ unitPricePaise: 100000, quantity: 1 }], discountPaise: 0, shippingPaise: 0, taxRatePercent: 0, commissionPercent: 10 });
    expect(result.platformCommissionPaise).toBe(10000);
  });

  it("never lets a discount exceed the subtotal", () => {
    const result = computeOrderTotals({ items: [{ unitPricePaise: 1000, quantity: 1 }], discountPaise: 5000, shippingPaise: 0, taxRatePercent: 0, commissionPercent: 0 });
    expect(result.discountPaise).toBe(1000);
    expect(result.totalPaise).toBe(0);
  });
});
