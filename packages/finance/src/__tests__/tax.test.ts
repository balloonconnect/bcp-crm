import { describe, expect, it } from "vitest";
import { computeGstAmount, computeTdsAmount, computeVendorBillTotal } from "../tax";

describe("computeGstAmount", () => {
  it("computes GST on a taxable amount", () => {
    expect(computeGstAmount(100000, 18)).toBe(18000);
  });
});

describe("computeTdsAmount", () => {
  it("computes TDS to be withheld", () => {
    expect(computeTdsAmount(100000, 10)).toBe(10000);
  });
});

describe("computeVendorBillTotal", () => {
  it("adds GST and subtracts TDS from the base amount", () => {
    expect(computeVendorBillTotal(100000, 18000, 10000)).toBe(108000);
  });
});
