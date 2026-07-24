import { describe, expect, it } from "vitest";
import { computeBookingCostSummary, resolveMilestoneStatus } from "../pricing";

describe("computeBookingCostSummary", () => {
  const lineItems = [
    { quantity: 1, unitPrice: 800000, internalPrice: 500000 },
    { quantity: 2, unitPrice: 100000, internalPrice: 40000 },
  ];

  it("sums selling price and internal cost independently", () => {
    const summary = computeBookingCostSummary(lineItems);
    expect(summary.sellingPrice).toBe(1000000);
    expect(summary.internalCost).toBe(580000);
  });

  it("computes estimated profit as selling price minus internal cost", () => {
    const summary = computeBookingCostSummary(lineItems);
    expect(summary.estimatedProfit).toBe(420000);
  });

  it("computes profit margin relative to selling price", () => {
    const summary = computeBookingCostSummary(lineItems);
    expect(summary.profitMarginPercent).toBeCloseTo(42, 0);
  });

  it("returns 0% margin instead of dividing by zero with no line items", () => {
    const summary = computeBookingCostSummary([]);
    expect(summary.profitMarginPercent).toBe(0);
  });
});

describe("resolveMilestoneStatus", () => {
  const now = new Date("2026-07-13T00:00:00Z");

  it("keeps a paid milestone paid regardless of due date", () => {
    expect(resolveMilestoneStatus({ status: "paid", dueDate: new Date("2026-01-01") }, now)).toBe("paid");
  });

  it("flags a past-due, unpaid milestone as overdue", () => {
    expect(resolveMilestoneStatus({ status: "pending", dueDate: new Date("2026-01-01") }, now)).toBe("overdue");
  });

  it("keeps a future-due milestone pending", () => {
    expect(resolveMilestoneStatus({ status: "pending", dueDate: new Date("2027-01-01") }, now)).toBe("pending");
  });

  it("keeps a milestone with no due date pending", () => {
    expect(resolveMilestoneStatus({ status: "pending", dueDate: null }, now)).toBe("pending");
  });
});
