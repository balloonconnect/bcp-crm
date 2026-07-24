import { describe, expect, it } from "vitest";
import { invoiceInputSchema, paymentInputSchema, creditNoteInputSchema } from "../validation";

describe("invoiceInputSchema", () => {
  it("accepts a minimal invoice", () => {
    expect(invoiceInputSchema.safeParse({ subtotal: 100000 }).success).toBe(true);
  });

  it("accepts installments", () => {
    const result = invoiceInputSchema.safeParse({ subtotal: 100000, installments: [{ label: "Advance", dueDate: new Date().toISOString(), amount: 50000 }] });
    expect(result.success).toBe(true);
  });
});

describe("paymentInputSchema", () => {
  it("accepts a cash payment", () => {
    expect(paymentInputSchema.safeParse({ amount: 50000, method: "cash" }).success).toBe(true);
  });

  it("accepts a razorpay payment with a gateway transaction id", () => {
    expect(paymentInputSchema.safeParse({ amount: 50000, method: "razorpay", gatewayTransactionId: "pay_ABC123" }).success).toBe(true);
  });

  it("rejects a non-positive amount", () => {
    expect(paymentInputSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
});

describe("creditNoteInputSchema", () => {
  it("accepts a minimal credit note", () => {
    expect(creditNoteInputSchema.safeParse({ amount: 10000 }).success).toBe(true);
  });
});
