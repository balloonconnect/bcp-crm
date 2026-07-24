import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { RazorpayProvider } from "../razorpay";

describe("RazorpayProvider.verifyWebhookSignature", () => {
  const provider = new RazorpayProvider("test-key-id", "test-key-secret");
  const secret = "webhook-secret";
  const payload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123", amount: 50000 } } } });

  it("accepts a signature computed with the correct algorithm and secret", () => {
    const validSignature = createHmac("sha256", secret).update(payload).digest("hex");
    expect(provider.verifyWebhookSignature(payload, validSignature, secret)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const wrongSignature = createHmac("sha256", "wrong-secret").update(payload).digest("hex");
    expect(provider.verifyWebhookSignature(payload, wrongSignature, secret)).toBe(false);
  });

  it("rejects a signature for a tampered payload", () => {
    const validSignature = createHmac("sha256", secret).update(payload).digest("hex");
    const tamperedPayload = payload.replace("50000", "5");
    expect(provider.verifyWebhookSignature(tamperedPayload, validSignature, secret)).toBe(false);
  });

  it("rejects a malformed signature outright", () => {
    expect(provider.verifyWebhookSignature(payload, "not-a-real-signature", secret)).toBe(false);
  });
});
