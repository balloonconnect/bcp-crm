/** The 7 payment methods named in the brief. Unlike category-style fields elsewhere (Equipment.category, Vendor.category), this one *is* a real DB enum (`PaymentMethod`) rather than free text — payment method drives real logic (which need a gateway reference, receipt formatting) in a way a vendor category never does, so it's worth the schema rigidity. This registry exists for UI labels and the "does this method need a gateway reference" check, not to loosen the enum. */
export const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", requiresGatewayReference: false },
  { key: "upi", label: "UPI", requiresGatewayReference: false },
  { key: "card", label: "Card", requiresGatewayReference: false },
  { key: "bank_transfer", label: "Bank transfer", requiresGatewayReference: false },
  { key: "cheque", label: "Cheque", requiresGatewayReference: false },
  { key: "razorpay", label: "Razorpay", requiresGatewayReference: true },
  { key: "cashfree", label: "Cashfree", requiresGatewayReference: true },
  { key: "other", label: "Other", requiresGatewayReference: false },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

export function requiresGatewayReference(method: string): boolean {
  return PAYMENT_METHODS.find((m) => m.key === method)?.requiresGatewayReference ?? false;
}
