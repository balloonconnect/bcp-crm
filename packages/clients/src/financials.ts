export interface InvoiceLike {
  totalAmount: number; // paise
  amountPaid: number; // paise
  status: string;
}

/** Lifetime value = total actually paid across every invoice, not the total invoiced (an unpaid or cancelled invoice isn't value realized yet). */
export function computeLifetimeValue(invoices: InvoiceLike[]): number {
  return invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
}

/** Outstanding = total invoiced minus total paid, across everything not cancelled — a cancelled invoice's balance was never really owed. */
export function computeOutstandingAmount(invoices: InvoiceLike[]): number {
  return invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + (invoice.totalAmount - invoice.amountPaid), 0);
}
