import { describe, expect, it } from "vitest";
import { computeLifetimeValue, computeOutstandingAmount } from "../financials";

describe("computeLifetimeValue", () => {
  it("sums amountPaid, not totalAmount", () => {
    const invoices = [
      { totalAmount: 100000, amountPaid: 100000, status: "paid" },
      { totalAmount: 50000, amountPaid: 20000, status: "partially_paid" },
    ];
    expect(computeLifetimeValue(invoices)).toBe(120000);
  });

  it("returns 0 with no invoices", () => {
    expect(computeLifetimeValue([])).toBe(0);
  });
});

describe("computeOutstandingAmount", () => {
  it("sums the unpaid balance across non-cancelled invoices", () => {
    const invoices = [
      { totalAmount: 100000, amountPaid: 60000, status: "partially_paid" },
      { totalAmount: 50000, amountPaid: 0, status: "unpaid" },
      { totalAmount: 20000, amountPaid: 0, status: "cancelled" },
    ];
    expect(computeOutstandingAmount(invoices)).toBe(90000);
  });

  it("returns 0 when everything is paid", () => {
    expect(computeOutstandingAmount([{ totalAmount: 100000, amountPaid: 100000, status: "paid" }])).toBe(0);
  });
});
