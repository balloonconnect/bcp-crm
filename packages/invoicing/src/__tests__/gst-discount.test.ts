import { describe, expect, it } from "vitest";
import { computeGstSplit } from "../gst";
import { computeDiscountAmount } from "../discount";

describe("computeGstSplit", () => {
  it("splits intra-state GST evenly into CGST and SGST", () => {
    const result = computeGstSplit(100000, 18, false);
    expect(result.gstAmount).toBe(18000);
    expect(result.cgstAmount).toBe(9000);
    expect(result.sgstAmount).toBe(9000);
    expect(result.igstAmount).toBe(0);
  });

  it("applies the full rate as IGST for inter-state", () => {
    const result = computeGstSplit(100000, 18, true);
    expect(result.gstAmount).toBe(18000);
    expect(result.igstAmount).toBe(18000);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
  });

  it("handles an odd GST amount without losing a paisa", () => {
    const result = computeGstSplit(100001, 9, false); // odd total
    expect(result.cgstAmount + result.sgstAmount).toBe(result.gstAmount);
  });
});

describe("computeDiscountAmount", () => {
  it("computes a percentage discount", () => {
    expect(computeDiscountAmount(100000, { type: "percentage", value: 10 })).toBe(10000);
  });

  it("computes a fixed discount", () => {
    expect(computeDiscountAmount(100000, { type: "fixed_amount", value: 5000 })).toBe(5000);
  });

  it("clamps a discount larger than the subtotal", () => {
    expect(computeDiscountAmount(10000, { type: "fixed_amount", value: 50000 })).toBe(10000);
  });

  it("returns 0 with no discount", () => {
    expect(computeDiscountAmount(100000, null)).toBe(0);
  });
});
