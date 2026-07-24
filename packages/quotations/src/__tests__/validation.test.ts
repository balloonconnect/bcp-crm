import { describe, expect, it } from "vitest";
import { quotationInputSchema, quotationStatusChangeSchema, approvalSchema, otpVerifySchema } from "../validation";

describe("quotationInputSchema", () => {
  it("accepts a minimal quotation", () => {
    expect(quotationInputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a full quotation with line items and payment schedule", () => {
    const result = quotationInputSchema.safeParse({
      clientId: "00000000-0000-0000-0000-000000000000",
      lineItems: [{ name: "Traditional Photography", unitPrice: 800000 }],
      discountType: "percentage",
      discountValue: 10,
      paymentSchedule: [{ label: "Advance", percentage: 50 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("quotationStatusChangeSchema", () => {
  it("accepts a known status", () => {
    expect(quotationStatusChangeSchema.safeParse({ status: "sent" }).success).toBe(true);
  });
  it("rejects an unknown status", () => {
    expect(quotationStatusChangeSchema.safeParse({ status: "bogus" }).success).toBe(false);
  });
});

describe("approvalSchema", () => {
  it("accepts an acceptance with a signed name", () => {
    expect(approvalSchema.safeParse({ action: "accepted", signedByName: "Ananya Sharma" }).success).toBe(true);
  });
  it("accepts a rejection with a reason", () => {
    expect(approvalSchema.safeParse({ action: "rejected", rejectionReason: "Went with another studio" }).success).toBe(true);
  });
});

describe("otpVerifySchema", () => {
  it("requires exactly a 6-digit code", () => {
    expect(otpVerifySchema.safeParse({ target: "a@b.com", code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ target: "a@b.com", code: "12345" }).success).toBe(false);
  });
});
