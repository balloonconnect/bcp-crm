export interface InvoiceForReceivables {
  totalAmount: number;
  amountPaid: number;
  status: string;
}

/** Receivables = money clients still owe — the unpaid balance across every invoice not cancelled, same computation `@bcp/clients`' `computeOutstandingAmount` already does per-client, applied here studio-wide. */
export function computeReceivables(invoices: InvoiceForReceivables[]): number {
  return invoices.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);
}

export interface VendorBillForPayables {
  totalAmount: number;
  amountPaid: number;
  status: string;
}

export interface FreelancerPaymentForPayables {
  amount: number;
  status: string;
}

/** Payables = money the studio owes others — unpaid vendor bills plus unpaid freelancer payments, the two sources of outgoing obligation this codebase tracks (`VendorBill` from this phase, `FreelancerPayment` from Prompt 20). Cancelled bills/payments are excluded the same way a cancelled invoice doesn't count toward receivables. */
export function computePayables(bills: VendorBillForPayables[], freelancerPayments: FreelancerPaymentForPayables[]): number {
  const billsOwed = bills.filter((b) => b.status !== "paid").reduce((sum, b) => sum + (b.totalAmount - b.amountPaid), 0);
  const freelancerOwed = freelancerPayments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  return billsOwed + freelancerOwed;
}
