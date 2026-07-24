"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { PackageFormDialog } from "../../components/catalog/package-form-dialog";
import { PackageDetailDialog } from "../../components/catalog/package-detail-dialog";

interface PackageSummary {
  id: string;
  name: string;
  eventType: string;
  customerFacingTotal: number;
  itemLevelPricingEnabled: boolean;
  isActive: boolean;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function PackagesPage() {
  const [packages, setPackages] = React.useState<PackageSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<PackageSummary[]>("/packages?includeInactive=true");
    if (res.ok && res.data) setPackages(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Packages</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New package
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading packages…" />
      ) : packages.length === 0 ? (
        <EmptyState title="No packages yet" description="Bundle your services into packages you can quote from." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <button key={pkg.id} type="button" onClick={() => setDetailId(pkg.id)} className="flex flex-col gap-2 rounded-lg border border-border p-4 text-left hover:bg-accent">
              <div className="flex items-center justify-between">
                <span className="font-medium">{pkg.name}</span>
                {!pkg.isActive && <Badge variant="outline">Inactive</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{pkg.eventType}</span>
              <span className="font-display text-lg">{formatRupees(pkg.customerFacingTotal)}</span>
              <Badge variant={pkg.itemLevelPricingEnabled ? "warning" : "outline"} className="w-fit">
                {pkg.itemLevelPricingEnabled ? "Item pricing visible" : "Item pricing hidden"}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <PackageFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <PackageDetailDialog packageId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} />
    </main>
  );
}
