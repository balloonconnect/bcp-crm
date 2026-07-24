"use client";

import * as React from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState } from "@bcp/ui";
import { EQUIPMENT_CATEGORIES } from "@bcp/equipment";
import { apiGet } from "../../lib/api-client";
import { EquipmentFormDialog } from "../../components/equipment/equipment-form-dialog";
import { EquipmentDetailDialog } from "../../components/equipment/equipment-detail-dialog";

interface EquipmentRecord {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  condition: string;
  currentStatus: string;
}
interface Overview {
  valuation: { totalReplacementValue: number; totalPurchaseValue: number };
  expiringItems: { equipmentId: string; equipmentName: string; type: string; urgency: string }[];
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = { available: "success", checked_out: "warning", in_maintenance: "outline", in_repair: "destructive", retired: "outline" };

export default function EquipmentPage() {
  const [items, setItems] = React.useState<EquipmentRecord[]>([]);
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [itemsRes, overviewRes] = await Promise.all([apiGet<EquipmentRecord[]>("/equipment?includeInactive=true"), apiGet<Overview>("/equipment/overview")]);
    if (itemsRes.ok && itemsRes.data) setItems(itemsRes.data);
    if (overviewRes.ok && overviewRes.data) setOverview(overviewRes.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Equipment</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New equipment
        </Button>
      </div>

      {overview && (
        <div className="mb-6 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-4 rounded-md border border-border p-3 sm:w-fit sm:grid-cols-2">
            <div><p className="font-display text-xl">{formatRupees(overview.valuation.totalReplacementValue)}</p><p className="text-xs text-muted-foreground">Total replacement value</p></div>
            <div><p className="font-display text-xl">{formatRupees(overview.valuation.totalPurchaseValue)}</p><p className="text-xs text-muted-foreground">Total purchase value</p></div>
          </div>
          {overview.expiringItems.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Needs attention</p>
              {overview.expiringItems.map((item, i) => (
                <p key={i} className="text-xs text-muted-foreground">{item.equipmentName} — {item.type} {item.urgency === "expired" ? "has expired" : "expiring soon"}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading equipment…" />
      ) : items.length === 0 ? (
        <EmptyState title="No equipment yet" description="Add your cameras, lenses, and other gear to start tracking checkouts and maintenance." />
      ) : (
        <div className="flex flex-col gap-8">
          {EQUIPMENT_CATEGORIES.map((category) => {
            const categoryItems = items.filter((item) => item.category === category);
            if (categoryItems.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{category}</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => setDetailId(item.id)} className="flex flex-col gap-1 rounded-md border border-border p-3 text-left hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant={STATUS_VARIANT[item.currentStatus] ?? "outline"} className="capitalize">{item.currentStatus.replace(/_/g, " ")}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">Qty {item.quantity} · {item.condition}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EquipmentFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <EquipmentDetailDialog equipmentId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
