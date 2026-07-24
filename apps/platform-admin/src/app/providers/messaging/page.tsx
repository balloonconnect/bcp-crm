"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../../lib/use-api";

interface ProviderStatus {
  key: string;
  name: string;
  category: string;
  configured: boolean;
}

export default function MessagingProvidersPage() {
  const { data, loading } = useApiGet<ProviderStatus[]>("/platform/providers/messaging");

  const columns: DataColumn<ProviderStatus>[] = [
    { id: "name", header: "Provider", isPrimary: true, cell: (row) => row.name },
    { id: "category", header: "Category", cell: (row) => row.category.replace("messaging_", ""), hideBelow: "lg" },
    {
      id: "configured",
      header: "Status",
      cell: (row) => <Badge variant={row.configured ? "success" : "secondary"}>{row.configured ? "Configured" : "Not configured"}</Badge>,
    },
  ];

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader title="Messaging Providers" description="WhatsApp and email delivery connection status." />
      <ResponsiveDataView columns={columns} rows={data ?? []} getRowId={(row) => row.key} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
