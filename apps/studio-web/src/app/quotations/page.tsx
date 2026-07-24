"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, ResponsiveDataView, LoadingState, EmptyState, type DataColumn } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { QuotationFormDialog } from "../../components/quotations/quotation-form-dialog";
import { QuotationDetailDialog } from "../../components/quotations/quotation-detail-dialog";

interface QuotationSummary {
  id: string;
  quotationNumber: string;
  status: string;
  totalAmount: number;
  validUntil: string | null;
  createdAt: string;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive" | "secondary"> = {
  draft: "outline", sent: "secondary", viewed: "warning", accepted: "success", converted: "success", rejected: "destructive", expired: "outline",
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = React.useState<QuotationSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<QuotationSummary[]>("/quotations");
    if (res.ok && res.data) setQuotations(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const columns: DataColumn<QuotationSummary>[] = [
    { id: "number", header: "Quotation", cell: (row) => row.quotationNumber, isPrimary: true },
    { id: "status", header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">{row.status}</Badge> },
    { id: "total", header: "Total", cell: (row) => formatRupees(row.totalAmount), align: "end" },
    { id: "validUntil", header: "Valid until", cell: (row) => (row.validUntil ? new Date(row.validUntil).toLocaleDateString("en-IN") : "—"), hideBelow: "md" },
    { id: "created", header: "Created", cell: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"), hideBelow: "lg" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8" data-tour="quotations-list">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Quotations</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New quotation
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading quotations…" />
      ) : quotations.length === 0 ? (
        <EmptyState title="No quotations yet" description="Create one from a package or build it from scratch." />
      ) : (
        <ResponsiveDataView columns={columns} rows={quotations} getRowId={(row) => row.id} onRowClick={(row) => setDetailId(row.id)} />
      )}

      <QuotationFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <QuotationDetailDialog quotationId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
