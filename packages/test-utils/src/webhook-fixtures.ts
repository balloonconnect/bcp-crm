import { createHmac } from "node:crypto";

/** Builds a Razorpay-style webhook signature exactly matching `RazorpayProvider.verifyWebhookSignature()`'s own algorithm (HMAC-SHA256 over the raw JSON string, hex digest) — so a test can send a payload the real verification code will actually accept, not a plausible-looking fake. */
export function signRazorpayWebhookPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function buildRazorpayPaymentCapturedPayload(paymentId: string, orderId: string, amountPaise: number) {
  return JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: amountPaise, status: "captured" } } },
  });
}

/** The WhatsApp/Meta Cloud API's subscription handshake — a GET request with `hub.mode=subscribe`, a verify token the studio itself configured, and a challenge string the endpoint must echo back verbatim if the token matches. */
export function buildWhatsAppVerificationQuery(verifyToken: string, challenge = "test-challenge-123") {
  return { "hub.mode": "subscribe", "hub.verify_token": verifyToken, "hub.challenge": challenge };
}

export function buildWhatsAppInboundMessagePayload(fromPhone: string, messageBody: string, wamid = "wamid.test123") {
  return {
    entry: [{ changes: [{ value: { messages: [{ from: fromPhone, id: wamid, timestamp: String(Math.floor(Date.now() / 1000)), text: { body: messageBody }, type: "text" }] } }] }],
  };
}

export function buildWhatsAppStatusUpdatePayload(wamid: string, status: "sent" | "delivered" | "read" | "failed") {
  return {
    entry: [{ changes: [{ value: { statuses: [{ id: wamid, status, timestamp: String(Math.floor(Date.now() / 1000)) }] } }] }],
  };
}
