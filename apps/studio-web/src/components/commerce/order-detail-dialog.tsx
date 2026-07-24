"use client";

import * as React from "react";
import { Download, Truck, CreditCard } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface OrderItem { id: string; quantity: number; unitPricePaise: number; totalPaise: number; product: { name: string; category: string }; variant: { size: string | null; finish: string | null } | null }
interface Payment { id: string; amountPaise: number; method: string; status: string }
interface OrderDetail { id: string; orderNumber: string; status: string; subtotalPaise: number; discountPaise: number; shippingPaise: number; taxPaise: number; totalPaise: number; platformCommissionPaise: number; items: OrderItem[]; payments: Payment[]; courierName: string | null; trackingNumber: string | null }

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { pending: "outline", paid: "success", processing: "warning", fulfilled: "warning", shipped: "warning", delivered: "success", cancelled: "destructive" };

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function OrderDetailDialog({ orderId, open, onOpenChange, onChanged }: { orderId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [courierName, setCourierName] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const load = React.useCallback(async () => {
    if (!orderId) return;
    const res = await apiGet<OrderDetail>(`/commerce-orders/${orderId}`);
    if (res.ok && res.data) setOrder(res.data);
  }, [orderId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleRecordPayment() {
    if (!orderId || !paymentAmount) return;
    await apiPost(`/commerce-orders/${orderId}/payment`, { amountPaise: Math.round(Number(paymentAmount) * 100), method: "bank_transfer" });
    setPaymentAmount("");
    await load();
    onChanged();
  }

  async function handleDispatch() {
    if (!orderId || !courierName.trim() || !trackingNumber.trim()) return;
    await apiPost(`/commerce-orders/${orderId}/dispatch`, { courierName, trackingNumber });
    setCourierName(""); setTrackingNumber("");
    await load();
    onChanged();
  }

  async function handleDelivered() {
    if (!orderId) return;
    await apiPost(`/commerce-orders/${orderId}/delivered`);
    await load();
    onChanged();
  }

  if (!order) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={order.orderNumber} className="sm:max-w-xl">
      <div className="flex flex-col gap-5">
        <Badge variant={STATUS_VARIANT[order.status] ?? "outline"} className="w-fit capitalize">{order.status}</Badge>

        <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between p-2">
              <span>{item.product.name} {item.variant ? `(${[item.variant.size, item.variant.finish].filter(Boolean).join(" ")})` : ""} × {item.quantity}</span>
              <span>{formatPaise(item.totalPaise)}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPaise(order.subtotalPaise)}</span></div>
          {order.discountPaise > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatPaise(order.discountPaise)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span>{formatPaise(order.shippingPaise)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatPaise(order.taxPaise)}</span></div>
          <div className="flex justify-between font-medium"><span>Total</span><span>{formatPaise(order.totalPaise)}</span></div>
          {order.platformCommissionPaise > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Platform commission</span><span>{formatPaise(order.platformCommissionPaise)}</span></div>}
        </div>

        <div className="flex gap-2">
          <Input type="number" placeholder="Payment amount (₹)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <Button type="button" size="sm" variant="outline" onClick={() => void handleRecordPayment()}><CreditCard className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Record payment</Button>
        </div>

        {!order.trackingNumber ? (
          <div className="flex gap-2">
            <Input placeholder="Courier" value={courierName} onChange={(e) => setCourierName(e.target.value)} />
            <Input placeholder="Tracking #" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            <Button type="button" size="sm" variant="outline" onClick={() => void handleDispatch()}><Truck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Dispatch</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span>{order.courierName}: {order.trackingNumber}</span>
            {order.status !== "delivered" && <Button type="button" size="sm" variant="outline" onClick={() => void handleDelivered()}>Mark delivered</Button>}
          </div>
        )}

        <Button asChild size="sm" variant="outline" className="self-start">
          <a href={`${apiBase}/commerce-orders/${order.id}/lab-export`} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Export for lab</a>
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
