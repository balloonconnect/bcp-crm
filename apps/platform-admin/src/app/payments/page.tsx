"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider: string;
  createdAt: string;
  studio: { name: string; slug: string };
}

interface PaymentsResponse {
  items: PaymentRow[];
  total: number;
}

const statusVariant: Record<PaymentRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  pending: "secondary",
  succeeded: "success",
  failed: "destructive",
  refunded: "warning",
};

export default function PaymentsPage() {
  const { data, loading } = useApiGet<PaymentsResponse>("/platform/payments");

  const columns: DataColumn<PaymentRow>[] = [
    { id: "studio", header: "Studio", isPrimary: true, cell: (row) => row.studio.name },
    { id: "amount", header: "Amount", cell: (row) => `${row.currency} ${(row.amount / 100).toLocaleString()}`, align: "end" },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge> },
    { id: "provider", header: "Provider", cell: (row) => row.provider, hideBelow: "lg" },
    { id: "createdAt", header: "Date", cell: (row) => new Date(row.createdAt).toLocaleDateString(), align: "end" },
  ];

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Payments" description="Every billing transaction attempt across every studio." />
      <ResponsiveDataView columns={columns} rows={data?.items ?? []} getRowId={(row) => row.id} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
