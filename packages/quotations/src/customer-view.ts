export interface QuotationLineItemForView {
  kind: "service" | "add_on";
  name: string;
  quantity: number;
  unitPrice: number; // paise
}

export interface QuotationPaymentScheduleForView {
  label: string;
  percentage: number;
  amount: number;
  trigger: string;
}

export interface QuotationForView {
  quotationNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  gstRatePercent: number;
  gstAmount: number;
  totalAmount: number;
  itemLevelPricingEnabled: boolean;
  termsText?: string | null;
  validUntil?: Date | null;
  lineItems: QuotationLineItemForView[];
  paymentSchedule: QuotationPaymentScheduleForView[];
}

export interface CustomerFacingLineItem {
  name: string;
  quantity: number;
  /** Present only when the quotation has item-level pricing enabled — same rule as `@bcp/catalog`'s `buildCustomerFacingPackageView`, extended to quotations since this is exactly the "customer PDFs or WhatsApp messages" surface the brief's rule names directly. */
  unitPrice?: number;
  lineTotal?: number;
}

export interface CustomerFacingQuotationView {
  quotationNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  gstRatePercent: number;
  gstAmount: number;
  totalAmount: number;
  termsText?: string;
  validUntil?: Date;
  lineItems: CustomerFacingLineItem[];
  paymentSchedule: QuotationPaymentScheduleForView[];
  itemLevelPricingShown: boolean;
}

/**
 * THE enforcement point for quotations, mirroring `@bcp/catalog`'s
 * `buildCustomerFacingPackageView` exactly on purpose — this is the
 * same rule ("internal individual service prices must not appear in
 * customer PDFs or WhatsApp messages unless the studio explicitly
 * enables item-level pricing"), applied to the artifact the rule
 * actually names. The PDF generator, the WhatsApp message builder, and
 * the public quotation page must all build their content through this
 * function — never by reading `QuotationLineItem.internalPrice` or
 * iterating raw line items directly.
 *
 * Note what's *always* shown regardless of the flag: `subtotal`,
 * `discountAmount`, `gstAmount`, and `totalAmount` are the customer's
 * own quoted figures, not the studio's internal costs — those are
 * always customer-facing by definition. Only the per-line breakdown of
 * what each included service individually costs is gated.
 */
export function buildCustomerFacingQuotationView(quotation: QuotationForView): CustomerFacingQuotationView {
  const lineItems: CustomerFacingLineItem[] = quotation.lineItems.map((item) => {
    if (!quotation.itemLevelPricingEnabled) {
      return { name: item.name, quantity: item.quantity };
    }
    return { name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.unitPrice * item.quantity };
  });

  return {
    quotationNumber: quotation.quotationNumber,
    status: quotation.status,
    subtotal: quotation.subtotal,
    discountAmount: quotation.discountAmount,
    gstRatePercent: quotation.gstRatePercent,
    gstAmount: quotation.gstAmount,
    totalAmount: quotation.totalAmount,
    termsText: quotation.termsText ?? undefined,
    validUntil: quotation.validUntil ?? undefined,
    lineItems,
    paymentSchedule: quotation.paymentSchedule,
    itemLevelPricingShown: quotation.itemLevelPricingEnabled,
  };
}
