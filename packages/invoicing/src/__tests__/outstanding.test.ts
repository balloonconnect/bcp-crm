import { describe, expect, it } from "vitest";
import { computeInvoiceTotals, computeOutstanding, resolveInstallmentStatus } from "../outstanding";

describe("computeInvoiceTotals", () => {
  it("composes discount then GST in order", () => {
    const result = computeInvoiceTotals({ subtotal: 100000, discount: { type: "percentage", value: 10 }, gstRatePercent: 18, isInterState: false });
    expect(result.discountAmount).toBe(10000);
    expect(result.taxableAmount).toBe(90000);
    expect(result.gstAmount).toBe(16200);
    expect(result.totalAmount).toBe(106200);
  });

  it("splits GST correctly within the composed total", () => {
    const result = computeInvoiceTotals({ subtotal: 100000, gstRatePercent: 18, isInterState: true });
    expect(result.igstAmount).toBe(18000);
    expect(result.cgstAmount).toBe(0);
  });
});

describe("computeOutstanding", () => {
  it("computes the unpaid balance", () => {
    expect(computeOutstanding({ totalAmount: 100000, amountPaid: 40000, status: "partially_paid" })).toBe(60000);
  });

  it("returns 0 for a cancelled invoice regardless of balance", () => {
    expect(computeOutstanding({ totalAmount: 100000, amountPaid: 0, status: "cancelled" })).toBe(0);
  });

  it("never returns a negative number", () => {
    expect(computeOutstanding({ totalAmount: 100000, amountPaid: 150000, status: "paid" })).toBe(0);
  });
});

describe("resolveInstallmentStatus", () => {
  const now = new Date("2026-07-14T00:00:00Z");

  it("keeps a paid installment paid", () => {
    expect(resolveInstallmentStatus({ status: "paid", dueDate: new Date("2026-01-01") }, now)).toBe("paid");
  });

  it("flags a past-due unpaid installment as overdue", () => {
    expect(resolveInstallmentStatus({ status: "pending", dueDate: new Date("2026-07-01") }, now)).toBe("overdue");
  });

  it("keeps a future installment pending", () => {
    expect(resolveInstallmentStatus({ status: "pending", dueDate: new Date("2026-08-01") }, now)).toBe("pending");
  });
});
