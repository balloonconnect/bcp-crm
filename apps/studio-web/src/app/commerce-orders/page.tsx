"use client";

import * as React from "react";
import { Badge, LoadingState, EmptyState } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { OrderDetailDialog } from "../../components/commerce/order-detail-dialog";

interface OrderRecord { id: string; orderNumber: string; status: string; totalPaise: number }

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { pending: "outline", paid: "success", processing: "warning", fulfilled: "warning", shipped: "warning", delivered: "success", cancelled: "destructive" };

export default function CommerceOrdersPage() {
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<OrderRecord[]>("/commerce-orders");
    if (res.ok && res.data) setOrders(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-2xl">Orders</h1>

      {loading ? (
        <LoadingState label="Loading orders…" />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders placed by clients for prints, canvas, albums, and more will appear here." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {orders.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => setDetailId(o.id)} className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-accent">
                <span className="font-medium">{o.orderNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">₹{(o.totalPaise / 100).toLocaleString("en-IN")}</span>
                  <Badge variant={STATUS_VARIANT[o.status] ?? "outline"} className="capitalize">{o.status}</Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <OrderDetailDialog orderId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
