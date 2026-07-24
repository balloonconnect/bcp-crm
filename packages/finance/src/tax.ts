/** GST added on top of a taxable amount — same convention as `@bcp/quotations`' GST computation, kept here too since expenses/vendor bills compute it independently rather than importing a quotation-specific package. */
export function computeGstAmount(taxableAmount: number, gstRatePercent: number): number {
  return Math.round((taxableAmount * gstRatePercent) / 100);
}

/** TDS (Tax Deducted at Source) is withheld from what's paid to a vendor/freelancer, not added — the studio deducts it and remits it separately, so the vendor receives `amount - tdsAmount`. */
export function computeTdsAmount(amount: number, tdsRatePercent: number): number {
  return Math.round((amount * tdsRatePercent) / 100);
}

export function computeVendorBillTotal(amount: number, gstAmount: number, tdsAmount: number): number {
  return amount + gstAmount - tdsAmount;
}
