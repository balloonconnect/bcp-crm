"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { VendorFormDialog } from "../../components/finance/vendor-form-dialog";
import { VendorDetailDialog } from "../../components/finance/vendor-detail-dialog";

interface VendorRecord {
  id: string;
  name: string;
  category: string | null;
  contactPersonName: string | null;
  contactPhone: string | null;
}

export default function VendorsPage() {
  const [vendors, setVendors] = React.useState<VendorRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<VendorRecord[]>("/vendors");
    if (res.ok && res.data) setVendors(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Vendors</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New vendor
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading vendors…" />
      ) : vendors.length === 0 ? (
        <EmptyState title="No vendors yet" description="Add the labs, freelancers, and suppliers your studio works with." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <button key={vendor.id} type="button" onClick={() => setDetailId(vendor.id)} className="flex flex-col gap-1 rounded-md border border-border p-3 text-left hover:bg-accent">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{vendor.name}</span>
                {vendor.category && <Badge variant="outline">{vendor.category}</Badge>}
              </div>
              {vendor.contactPersonName && <span className="text-xs text-muted-foreground">{vendor.contactPersonName}{vendor.contactPhone ? ` · ${vendor.contactPhone}` : ""}</span>}
            </button>
          ))}
        </div>
      )}

      <VendorFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <VendorDetailDialog vendorId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} />
    </main>
  );
}
