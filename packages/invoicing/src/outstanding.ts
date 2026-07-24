import { computeDiscountAmount, type DiscountInput } from "./discount";
import { computeGstSplit } from "./gst";

export interface InvoiceTotalsInput {
  subtotal: number; // paise
  discount?: DiscountInput | null;
  gstRatePercent: number;
  isInterState: boolean;
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

/** The single place an invoice's totals are computed — subtotal → discount → taxable amount → GST split → total, in that fixed order — composing `computeDiscountAmount()` and `computeGstSplit()` rather than each caller re-deriving the sequence itself. */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const discountAmount = computeDiscountAmount(input.subtotal, input.discount);
  const taxableAmount = input.subtotal - discountAmount;
  const gst = computeGstSplit(taxableAmount, input.gstRatePercent, input.isInterState);
  const totalAmount = taxableAmount + gst.gstAmount;

  return { subtotal: input.subtotal, discountAmount, taxableAmount, ...gst, totalAmount };
}

export interface InvoiceForOutstanding {
  totalAmount: number;
  amountPaid: number;
  status: string;
}

/** Outstanding = what's still owed on one invoice — the same shape of computation `@bcp/clients`' and `@bcp/finance`'s versions use, kept independent here since invoicing shouldn't depend on either of those packages just to answer its own core question. A cancelled invoice owes nothing, regardless of what was ever billed on it. */
export function computeOutstanding(invoice: InvoiceForOutstanding): number {
  if (invoice.status === "cancelled") return 0;
  return Math.max(0, invoice.totalAmount - invoice.amountPaid);
}

export interface InstallmentForStatus {
  status: string;
  dueDate: Date;
}

/** An installment past its due date and not yet paid is overdue — resolved on read, same pattern used for SLA/escalation and payment milestones elsewhere in this codebase, rather than a scheduled job. */
export function resolveInstallmentStatus(installment: InstallmentForStatus, now: Date = new Date()): "pending" | "paid" | "overdue" {
  if (installment.status === "paid") return "paid";
  return installment.dueDate.getTime() < now.getTime() ? "overdue" : "pending";
}
