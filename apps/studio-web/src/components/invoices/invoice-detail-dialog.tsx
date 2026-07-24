"use client";

import * as React from "react";
import { Download, Mail, MessageCircle, Bell } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Payment { id: string; amount: number; method: string; paidAt: string; receipt: { receiptNumber: string } | null }
interface CreditNote { id: string; creditNoteNumber: string; amount: number; status: string }
interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  documentType: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  totalAmount: number;
  amountPaid: number;
  payments: Payment[];
  creditNotes: CreditNote[];
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "card", label: "Card" }, { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" }, { value: "razorpay", label: "Razorpay" }, { value: "cashfree", label: "Cashfree" }, { value: "other", label: "Other" },
];
const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { unpaid: "warning", partially_paid: "warning", paid: "success", overdue: "destructive", cancelled: "outline" };

export function InvoiceDetailDialog({ invoiceId, open, onOpenChange, onChanged }: { invoiceId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const load = React.useCallback(async () => {
    if (!invoiceId) return;
    const res = await apiGet<InvoiceDetail>(`/invoices/${invoiceId}`);
    if (res.ok && res.data) setInvoice(res.data);
  }, [invoiceId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleRecordPayment() {
    if (!invoiceId || !paymentAmount) return;
    const res = await apiPost(`/invoices/${invoiceId}/payments`, { amount: Math.round(Number(paymentAmount) * 100), method: paymentMethod });
    if (res.ok) {
      setPaymentAmount("");
      setActionMessage("Payment recorded — receipt generated automatically.");
      await load();
      onChanged();
    }
  }

  async function handleSend(channel: "email" | "whatsapp" | "reminder") {
    if (!invoiceId) return;
    const res = await apiPost(`/invoices/${invoiceId}/send/${channel}`);
    setActionMessage(res.ok ? `Sent via ${channel}.` : res.error?.message ?? "Could not send");
  }

  if (!invoice) return null;
  const outstanding = invoice.totalAmount - invoice.amountPaid;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={invoice.invoiceNumber} description={invoice.documentType.replace(/_/g, " ")} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[invoice.status] ?? "outline"} className="capitalize">{invoice.status.replace(/_/g, " ")}</Badge>
          <Badge variant="outline">{formatRupees(outstanding)} outstanding</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Subtotal</dt><dd>{formatRupees(invoice.subtotal)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Discount</dt><dd>-{formatRupees(invoice.discountAmount)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">GST</dt><dd>{formatRupees(invoice.gstAmount)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-medium">{formatRupees(invoice.totalAmount)}</dd></div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <a href={`${apiBase}/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />PDF</Button>
          </a>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleSend("email")}><Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Email</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleSend("whatsapp")}><MessageCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />WhatsApp</Button>
          {outstanding > 0 && <Button type="button" variant="outline" size="sm" onClick={() => void handleSend("reminder")}><Bell className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Send reminder</Button>}
        </div>
        {actionMessage && <p className="text-xs text-muted-foreground">{actionMessage}</p>}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Payments</h3>
          <ul className="mb-2 flex flex-col divide-y divide-border text-sm">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between py-1.5">
                <span>{formatRupees(payment.amount)} · {payment.method} · {new Date(payment.paidAt).toLocaleDateString("en-IN")}</span>
                {payment.receipt && (
                  <a href={`${apiBase}/payments/${payment.id}/receipt/pdf`} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                    {payment.receipt.receiptNumber}
                  </a>
                )}
              </li>
            ))}
            {invoice.payments.length === 0 && <p className="py-2 text-xs text-muted-foreground">No payments recorded yet.</p>}
          </ul>
          {outstanding > 0 && (
            <div className="flex gap-2">
              <Input type="number" placeholder="Amount (₹)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-32" />
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} options={METHOD_OPTIONS} className="w-40" />
              <Button type="button" size="sm" onClick={() => void handleRecordPayment()}>Record payment</Button>
            </div>
          )}
        </div>

        {invoice.creditNotes.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Credit notes</h3>
            <ul className="flex flex-col divide-y divide-border text-sm">
              {invoice.creditNotes.map((cn) => (
                <li key={cn.id} className="flex items-center justify-between py-1.5">
                  <span>{cn.creditNoteNumber} — {formatRupees(cn.amount)}</span>
                  <Badge variant="outline" className="capitalize">{cn.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
