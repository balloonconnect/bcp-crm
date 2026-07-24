import { describe, expect, it } from "vitest";
import { computeReceivables, computePayables } from "../receivables-payables";

describe("computeReceivables", () => {
  it("sums the unpaid balance across non-cancelled invoices", () => {
    const invoices = [
      { totalAmount: 100000, amountPaid: 60000, status: "partially_paid" },
      { totalAmount: 50000, amountPaid: 0, status: "unpaid" },
      { totalAmount: 20000, amountPaid: 0, status: "cancelled" },
    ];
    expect(computeReceivables(invoices)).toBe(90000);
  });
});

describe("computePayables", () => {
  it("sums unpaid vendor bills and pending freelancer payments", () => {
    const bills = [{ totalAmount: 100000, amountPaid: 40000, status: "partially_paid" }];
    const freelancerPayments = [{ amount: 50000, status: "pending" }, { amount: 30000, status: "paid" }];
    expect(computePayables(bills, freelancerPayments)).toBe(60000 + 50000);
  });

  it("excludes fully paid bills", () => {
    const bills = [{ totalAmount: 100000, amountPaid: 100000, status: "paid" }];
    expect(computePayables(bills, [])).toBe(0);
  });
});
