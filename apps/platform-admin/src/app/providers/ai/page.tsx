"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../../lib/use-api";

interface ProviderStatus {
  key: string;
  name: string;
  category: string;
  configured: boolean;
}

export default function AiProvidersPage() {
  const { data, loading } = useApiGet<ProviderStatus[]>("/platform/providers/ai");

  const columns: DataColumn<ProviderStatus>[] = [
    { id: "name", header: "Provider", isPrimary: true, cell: (row) => row.name },
    {
      id: "configured",
      header: "Status",
      cell: (row) => <Badge variant={row.configured ? "success" : "secondary"}>{row.configured ? "Configured" : "Not configured"}</Badge>,
    },
  ];

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader
        title="AI Providers"
        description="Connection status only — API keys live in server environment variables, never in the database or this UI."
      />
      <ResponsiveDataView columns={columns} rows={data ?? []} getRowId={(row) => row.key} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
