"use client";

import * as React from "react";
import { ResponsiveDialog, Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface PO { id: string; poNumber: string; description: string; amount: number; status: string }
interface Bill { id: string; billNumber: string; totalAmount: number; amountPaid: number; status: string }
interface VendorDetail {
  id: string;
  name: string;
  category: string | null;
  contactPersonName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  paymentTerms: string | null;
  purchaseOrders: PO[];
  bills: Bill[];
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const PO_STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { draft: "outline", sent: "warning", fulfilled: "success", cancelled: "destructive" };
const BILL_STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { unpaid: "warning", partially_paid: "warning", paid: "success", overdue: "destructive" };

export function VendorDetailDialog({ vendorId, open, onOpenChange }: { vendorId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [vendor, setVendor] = React.useState<VendorDetail | null>(null);
  const [poDescription, setPoDescription] = React.useState("");
  const [poAmount, setPoAmount] = React.useState("");
  const [billNumber, setBillNumber] = React.useState("");
  const [billAmount, setBillAmount] = React.useState("");
  const [billGst, setBillGst] = React.useState("");

  const load = React.useCallback(async () => {
    if (!vendorId) return;
    const res = await apiGet<VendorDetail>(`/vendors/${vendorId}`);
    if (res.ok && res.data) setVendor(res.data);
  }, [vendorId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleAddPo() {
    if (!vendorId || !poDescription.trim() || !poAmount) return;
    await apiPost("/purchase-orders", { vendorId, description: poDescription, amount: Math.round(Number(poAmount) * 100) });
    setPoDescription(""); setPoAmount("");
    await load();
  }

  async function handleAddBill() {
    if (!vendorId || !billNumber.trim() || !billAmount) return;
    await apiPost("/vendor-bills", { vendorId, billNumber, billDate: new Date().toISOString(), amount: Math.round(Number(billAmount) * 100), gstAmount: billGst ? Math.round(Number(billGst) * 100) : undefined });
    setBillNumber(""); setBillAmount(""); setBillGst("");
    await load();
  }

  async function handleRecordPayment(billId: string, remaining: number) {
    await apiPost(`/vendor-bills/${billId}/payments`, { amount: remaining });
    await load();
  }

  if (!vendor) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={vendor.name} description={vendor.category ?? undefined} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {vendor.contactPersonName && <p><span className="text-muted-foreground">Contact:</span> {vendor.contactPersonName}</p>}
          {vendor.contactPhone && <p><span className="text-muted-foreground">Phone:</span> {vendor.contactPhone}</p>}
          {vendor.contactEmail && <p><span className="text-muted-foreground">Email:</span> {vendor.contactEmail}</p>}
          {vendor.paymentTerms && <p><span className="text-muted-foreground">Terms:</span> {vendor.paymentTerms}</p>}
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Purchase orders</h3>
          <ul className="mb-2 flex flex-col divide-y divide-border text-sm">
            {vendor.purchaseOrders.map((po) => (
              <li key={po.id} className="flex items-center justify-between py-1.5">
                <span>{po.poNumber} — {po.description} ({formatRupees(po.amount)})</span>
                <Badge variant={PO_STATUS_VARIANT[po.status] ?? "outline"} className="capitalize">{po.status}</Badge>
              </li>
            ))}
            {vendor.purchaseOrders.length === 0 && <p className="py-2 text-xs text-muted-foreground">No purchase orders yet.</p>}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Description" value={poDescription} onChange={(e) => setPoDescription(e.target.value)} />
            <Input type="number" placeholder="Amount (₹)" value={poAmount} onChange={(e) => setPoAmount(e.target.value)} className="w-32" />
            <Button type="button" size="sm" onClick={() => void handleAddPo()}>Add</Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Bills</h3>
          <ul className="mb-2 flex flex-col divide-y divide-border text-sm">
            {vendor.bills.map((bill) => {
              const remaining = bill.totalAmount - bill.amountPaid;
              return (
                <li key={bill.id} className="flex items-center justify-between py-1.5">
                  <span>{bill.billNumber} — {formatRupees(bill.totalAmount)}{bill.amountPaid > 0 ? ` (${formatRupees(bill.amountPaid)} paid)` : ""}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={BILL_STATUS_VARIANT[bill.status] ?? "outline"} className="capitalize">{bill.status.replace(/_/g, " ")}</Badge>
                    {bill.status !== "paid" && <Button type="button" variant="outline" size="sm" onClick={() => void handleRecordPayment(bill.id, remaining)}>Mark paid</Button>}
                  </div>
                </li>
              );
            })}
            {vendor.bills.length === 0 && <p className="py-2 text-xs text-muted-foreground">No bills yet.</p>}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Bill #" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="w-28" />
            <Input type="number" placeholder="Amount (₹)" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} className="w-28" />
            <Input type="number" placeholder="GST (₹)" value={billGst} onChange={(e) => setBillGst(e.target.value)} className="w-24" />
            <Button type="button" size="sm" onClick={() => void handleAddBill()}>Add</Button>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
