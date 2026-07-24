import { describe, expect, it } from "vitest";
import { PAYMENT_METHODS, requiresGatewayReference } from "../payment-methods";

describe("PAYMENT_METHODS", () => {
  it("has exactly the 7 methods named in the brief, plus other", () => {
    const keys = PAYMENT_METHODS.map((m) => m.key);
    expect(keys).toEqual(["cash", "upi", "card", "bank_transfer", "cheque", "razorpay", "cashfree", "other"]);
  });
});

describe("requiresGatewayReference", () => {
  it("requires a gateway reference for razorpay and cashfree", () => {
    expect(requiresGatewayReference("razorpay")).toBe(true);
    expect(requiresGatewayReference("cashfree")).toBe(true);
  });

  it("does not require one for cash", () => {
    expect(requiresGatewayReference("cash")).toBe(false);
  });

  it("returns false for an unknown method rather than throwing", () => {
    expect(requiresGatewayReference("bogus")).toBe(false);
  });
});
