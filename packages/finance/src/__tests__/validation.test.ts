import { describe, expect, it } from "vitest";
import { vendorInputSchema, expenseInputSchema, vendorBillInputSchema } from "../validation";

describe("vendorInputSchema", () => {
  it("accepts a minimal vendor", () => {
    expect(vendorInputSchema.safeParse({ name: "Album Lab X" }).success).toBe(true);
  });
});

describe("expenseInputSchema", () => {
  it("accepts a general expense", () => {
    expect(expenseInputSchema.safeParse({ category: "rent", amount: 50000, incurredOn: new Date().toISOString() }).success).toBe(true);
  });

  it("accepts an event expense with eventId set", () => {
    const result = expenseInputSchema.safeParse({ category: "travel", amount: 20000, incurredOn: new Date().toISOString(), eventId: "00000000-0000-0000-0000-000000000000" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    expect(expenseInputSchema.safeParse({ category: "bogus", amount: 100, incurredOn: new Date().toISOString() }).success).toBe(false);
  });
});

describe("vendorBillInputSchema", () => {
  it("accepts a minimal bill", () => {
    const result = vendorBillInputSchema.safeParse({ vendorId: "00000000-0000-0000-0000-000000000000", billNumber: "B-1", billDate: new Date().toISOString(), amount: 100000 });
    expect(result.success).toBe(true);
  });
});
