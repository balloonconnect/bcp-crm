import Razorpay from "razorpay";
import { createHmac } from "node:crypto";
import type { CreatePaymentLinkInput, PaymentLink, PaymentProvider } from "./provider";

export class RazorpayProvider implements PaymentProvider {
  private client: Razorpay;

  constructor(keyId: string, keySecret: string) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLink> {
    const link = await this.client.paymentLink.create({
      amount: input.amountInPaise,
      currency: input.currency,
      description: input.description,
      customer: { name: input.customerName, email: input.customerEmail },
    });
    return { id: link.id, url: link.short_url };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    return expected === signature;
  }
}
