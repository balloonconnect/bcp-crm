"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const DISCOUNT_TYPE_OPTIONS = [{ value: "percentage", label: "Percentage" }, { value: "fixed_amount", label: "Fixed amount" }];

interface CouponRecord { id: string; code: string; discountType: string; discountValue: number; usedCount: number; maxUses: number | null; isActive: boolean }

export function CouponsPanel() {
  const [coupons, setCoupons] = React.useState<CouponRecord[]>([]);
  const [code, setCode] = React.useState("");
  const [discountType, setDiscountType] = React.useState("percentage");
  const [discountValue, setDiscountValue] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await apiGet<CouponRecord[]>("/coupons");
    if (res.ok && res.data) setCoupons(res.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!code.trim() || !discountValue) return;
    await apiPost("/coupons", { code, discountType, discountValue: Number(discountValue) });
    setCode(""); setDiscountValue("");
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Coupons</h3>
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Input placeholder="Code (e.g. FESTIVE20)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-40" />
        <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} options={DISCOUNT_TYPE_OPTIONS} className="w-40" />
        <Input type="number" placeholder={discountType === "percentage" ? "% off" : "₹ off"} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="w-28" />
        <Button type="button" size="sm" onClick={() => void handleCreate()}><Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Add coupon</Button>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {coupons.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-2 text-sm">
            <span className="font-medium">{c.code}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`} off</span>
              <span>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""} used</span>
              <Badge variant={c.isActive ? "success" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </li>
        ))}
        {coupons.length === 0 && <li className="p-3 text-sm text-muted-foreground">No coupons yet.</li>}
      </ul>
    </div>
  );
}
