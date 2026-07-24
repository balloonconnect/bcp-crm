import { describe, expect, it } from "vitest";
import { computeQuotationTotals, computeQuotationMargin } from "../pricing";

describe("computeQuotationTotals", () => {
  const lineItems = [
    { quantity: 1, unitPrice: 800000, internalPrice: 500000 },
    { quantity: 2, unitPrice: 100000, internalPrice: 40000 },
  ];

  it("sums subtotal from quantity × unitPrice", () => {
    const totals = computeQuotationTotals(lineItems, null, 0);
    expect(totals.subtotal).toBe(1000000);
  });

  it("applies a percentage discount before tax", () => {
    const totals = computeQuotationTotals(lineItems, { type: "percentage", value: 10 }, 0);
    expect(totals.discountAmount).toBe(100000);
    expect(totals.taxableAmount).toBe(900000);
  });

  it("applies a fixed-amount discount", () => {
    const totals = computeQuotationTotals(lineItems, { type: "fixed_amount", value: 50000 }, 0);
    expect(totals.discountAmount).toBe(50000);
  });

  it("clamps discount so it never exceeds the subtotal", () => {
    const totals = computeQuotationTotals(lineItems, { type: "fixed_amount", value: 5000000 }, 0);
    expect(totals.discountAmount).toBe(totals.subtotal);
    expect(totals.taxableAmount).toBe(0);
  });

  it("computes GST on the taxable amount, after discount", () => {
    const totals = computeQuotationTotals(lineItems, { type: "percentage", value: 10 }, 18);
    expect(totals.taxableAmount).toBe(900000);
    expect(totals.gstAmount).toBe(162000);
    expect(totals.totalAmount).toBe(1062000);
  });

  it("sums internalCost from internalPrice × quantity, independent of the customer-facing total", () => {
    const totals = computeQuotationTotals(lineItems, null, 18);
    expect(totals.internalCost).toBe(580000);
  });

  it("treats a missing internalPrice as 0 (add-ons)", () => {
    const totals = computeQuotationTotals([{ quantity: 1, unitPrice: 50000 }], null, 0);
    expect(totals.internalCost).toBe(0);
  });
});

describe("computeQuotationMargin", () => {
  it("computes margin relative to the customer-facing total", () => {
    const margin = computeQuotationMargin(580000, 1000000);
    expect(margin.margin).toBe(420000);
    expect(margin.marginPercent).toBeCloseTo(42, 0);
  });

  it("returns 0% instead of dividing by zero", () => {
    expect(computeQuotationMargin(0, 0).marginPercent).toBe(0);
  });
});
