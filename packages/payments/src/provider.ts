export interface CreatePaymentLinkInput {
  amountInPaise: number;
  currency: "INR" | "USD";
  description: string;
  customerEmail: string;
  customerName: string;
}

export interface PaymentLink {
  id: string;
  url: string;
}

/** Common interface both Razorpay and Stripe adapters implement. */
export interface PaymentProvider {
  createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLink>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}
