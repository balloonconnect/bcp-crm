"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@bcp/ui";
import { publicApiFetch } from "../../lib/api";
import { ApprovalDialog } from "./approval-dialog";

interface LineItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}
interface PaymentScheduleItem {
  label: string;
  percentage: number;
  amount: number;
  trigger: string;
}
export interface QuotationViewData {
  quotationNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  gstRatePercent: number;
  gstAmount: number;
  totalAmount: number;
  termsText?: string;
  validUntil?: string;
  lineItems: LineItem[];
  paymentSchedule: PaymentScheduleItem[];
  itemLevelPricingShown: boolean;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const RESPONDED_STATUSES = new Set(["accepted", "rejected", "converted"]);

export function QuotationView({ token, studioName, initialView }: { token: string; studioName: string; initialView: QuotationViewData }) {
  const [view, setView] = React.useState(initialView);
  const [dialogAction, setDialogAction] = React.useState<"accepted" | "rejected" | null>(null);

  async function refetch() {
    const res = await publicApiFetch<{ studioName: string; view: QuotationViewData }>(`/public/quotations/${token}`);
    if (res.ok && res.data) setView(res.data.view);
  }

  const alreadyResponded = RESPONDED_STATUSES.has(view.status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{studioName}</p>
        <h1 className="font-display text-2xl">Quotation {view.quotationNumber}</h1>
      </div>

      {alreadyResponded && (
        <Card>
          <CardContent className="py-4 text-sm">
            {view.status === "accepted" && "You've accepted this quotation. The studio will be in touch to confirm next steps."}
            {view.status === "rejected" && "You've declined this quotation."}
            {view.status === "converted" && "This quotation has been converted into a confirmed booking."}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {view.lineItems.map((item, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>
                {item.lineTotal !== undefined && <span className="text-muted-foreground">{formatRupees(item.lineTotal)}</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRupees(view.subtotal)}</span></div>
          {view.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatRupees(view.discountAmount)}</span></div>}
          {view.gstAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">GST ({view.gstRatePercent}%)</span><span>{formatRupees(view.gstAmount)}</span></div>}
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-lg"><span>Total</span><span>{formatRupees(view.totalAmount)}</span></div>
          {view.validUntil && <p className="mt-2 text-xs text-muted-foreground">Valid until {new Date(view.validUntil).toLocaleDateString("en-IN")}</p>}
        </CardContent>
      </Card>

      {view.paymentSchedule.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment schedule</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {view.paymentSchedule.map((item, i) => (
              <div key={i} className="flex justify-between"><span>{item.label} ({item.percentage}%)</span><span>{formatRupees(item.amount)}</span></div>
            ))}
          </CardContent>
        </Card>
      )}

      {view.termsText && (
        <Card>
          <CardHeader><CardTitle className="text-base">Terms</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{view.termsText}</CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <a href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/public/quotations/${token}/pdf`} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
          Download PDF
        </a>
      </div>

      {!alreadyResponded && (
        <>
          {/* Desktop / tablet inline actions */}
          <div className="hidden gap-3 sm:flex">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogAction("rejected")}>
              Reject
            </Button>
            <Button type="button" className="flex-1" onClick={() => setDialogAction("accepted")}>
              Accept
            </Button>
          </div>

          {/* Mobile sticky action bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-border bg-background p-3 shadow-lg sm:hidden">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogAction("rejected")}>
              Reject
            </Button>
            <Button type="button" className="flex-1" onClick={() => setDialogAction("accepted")}>
              Accept
            </Button>
          </div>
        </>
      )}

      <ApprovalDialog token={token} action={dialogAction} onClose={() => setDialogAction(null)} onDone={refetch} />
    </div>
  );
}
