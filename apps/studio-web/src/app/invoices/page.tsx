"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, ResponsiveDataView, LoadingState, EmptyState, type DataColumn } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { InvoiceFormDialog } from "../../components/invoices/invoice-form-dialog";
import { InvoiceDetailDialog } from "../../components/invoices/invoice-detail-dialog";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  documentType: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  client: { name: string } | null;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { unpaid: "warning", partially_paid: "warning", paid: "success", overdue: "destructive", cancelled: "outline" };

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<InvoiceRecord[]>("/invoices");
    if (res.ok && res.data) setInvoices(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const columns: DataColumn<InvoiceRecord>[] = [
    { id: "number", header: "Invoice", cell: (row) => row.invoiceNumber, isPrimary: true },
    { id: "type", header: "Type", cell: (row) => <span className="capitalize">{row.documentType.replace(/_/g, " ")}</span>, hideBelow: "sm" },
    { id: "client", header: "Client", cell: (row) => row.client?.name ?? "—", hideBelow: "md" },
    { id: "total", header: "Total", cell: (row) => formatRupees(row.totalAmount), align: "end" },
    { id: "outstanding", header: "Outstanding", cell: (row) => formatRupees(row.totalAmount - row.amountPaid), align: "end", hideBelow: "lg" },
    { id: "status", header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">{row.status.replace(/_/g, " ")}</Badge> },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8" data-tour="invoices-list">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Invoices</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New invoice
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading invoices…" />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Create an invoice to start billing clients and tracking payments." />
      ) : (
        <ResponsiveDataView columns={columns} rows={invoices} getRowId={(row) => row.id} onRowClick={(row) => setDetailId(row.id)} />
      )}

      <InvoiceFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <InvoiceDetailDialog invoiceId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
