import { describe, expect, it } from "vitest";
import { signRazorpayWebhookPayload, buildRazorpayPaymentCapturedPayload, buildWhatsAppVerificationQuery, buildWhatsAppInboundMessagePayload } from "../webhook-fixtures";
import { createHmac } from "node:crypto";

describe("signRazorpayWebhookPayload", () => {
  it("produces a signature matching the same HMAC-SHA256 algorithm the real verifier uses", () => {
    const payload = buildRazorpayPaymentCapturedPayload("pay_123", "order_123", 50000);
    const signature = signRazorpayWebhookPayload(payload, "test-secret");
    const expected = createHmac("sha256", "test-secret").update(payload).digest("hex");
    expect(signature).toBe(expected);
  });

  it("produces a different signature for a different secret", () => {
    const payload = buildRazorpayPaymentCapturedPayload("pay_123", "order_123", 50000);
    expect(signRazorpayWebhookPayload(payload, "secret-a")).not.toBe(signRazorpayWebhookPayload(payload, "secret-b"));
  });
});

describe("buildWhatsAppVerificationQuery", () => {
  it("builds a valid Meta subscription-verification query", () => {
    const query = buildWhatsAppVerificationQuery("my-token");
    expect(query["hub.mode"]).toBe("subscribe");
    expect(query["hub.verify_token"]).toBe("my-token");
    expect(query["hub.challenge"]).toBeTruthy();
  });
});

describe("buildWhatsAppInboundMessagePayload", () => {
  it("builds a payload with the expected Meta Cloud API shape", () => {
    const payload = buildWhatsAppInboundMessagePayload("919876543210", "Hello");
    expect(payload.entry[0]!.changes[0]!.value.messages[0]!.text.body).toBe("Hello");
  });
});
