"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { ResponsiveDialog, Badge } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

interface Margin { internalCost: number; customerFacingTotal: number; margin: number; marginPercent: number }
interface CustomerView {
  name: string; total: number; itemLevelPricingShown: boolean;
  includedServices: { name: string; quantity: number; unitPrice?: number; lineTotal?: number }[];
  addOns: { name: string; price: number }[];
  paymentSchedule: { label: string; percentage: number }[];
  deliverables: string[];
}

export function PackageDetailDialog({ packageId, open, onOpenChange }: { packageId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [margin, setMargin] = React.useState<Margin | null>(null);
  const [customerView, setCustomerView] = React.useState<CustomerView | null>(null);

  React.useEffect(() => {
    if (!open || !packageId) {
      setMargin(null);
      setCustomerView(null);
      return;
    }
    void apiGet<Margin>(`/packages/${packageId}/margin`).then((res) => res.ok && setMargin(res.data ?? null));
    void apiGet<CustomerView>(`/packages/${packageId}/customer-view`).then((res) => res.ok && setCustomerView(res.data ?? null));
  }, [open, packageId]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={customerView?.name ?? "Package"} className="sm:max-w-2xl">
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Studio view (never shown to the customer)
          </h3>
          {margin ? (
            <div className="grid grid-cols-3 gap-4 rounded-md border border-border p-3">
              <div><p className="text-xs text-muted-foreground">Internal cost</p><p className="text-sm font-medium">{formatRupees(margin.internalCost)}</p></div>
              <div><p className="text-xs text-muted-foreground">Customer total</p><p className="text-sm font-medium">{formatRupees(margin.customerFacingTotal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Margin</p><p className="text-sm font-medium">{formatRupees(margin.margin)} ({margin.marginPercent.toFixed(0)}%)</p></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Customer-facing view
            <Badge variant={customerView?.itemLevelPricingShown ? "warning" : "outline"} className="ml-1">
              {customerView?.itemLevelPricingShown ? "Item-level pricing shown" : "Item-level pricing hidden"}
            </Badge>
          </h3>
          {customerView ? (
            <div className="rounded-md border border-border p-4">
              <p className="font-display text-lg">{formatRupees(customerView.total)}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {customerView.includedServices.map((service, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{service.name}{service.quantity > 1 ? ` × ${service.quantity}` : ""}</span>
                    {service.lineTotal !== undefined && <span className="text-muted-foreground">{formatRupees(service.lineTotal)}</span>}
                  </li>
                ))}
              </ul>
              {customerView.addOns.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Add-ons</p>
                  {customerView.addOns.map((addOn, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{addOn.name}</span>
                      <span className="text-muted-foreground">{formatRupees(addOn.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              {customerView.deliverables.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Deliverables</p>
                  <p className="text-sm">{customerView.deliverables.join(", ")}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
