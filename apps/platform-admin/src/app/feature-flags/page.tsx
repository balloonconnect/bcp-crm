"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPut } from "../../lib/api-client";

interface FeatureFlagRow {
  id: string;
  key: string;
  name: string | null;
  enabled: boolean;
  studioId: string | null;
}

export default function FeatureFlagsPage() {
  const { data, loading, refetch } = useApiGet<FeatureFlagRow[]>("/platform/feature-flags");

  async function toggle(row: FeatureFlagRow) {
    await apiPut("/platform/feature-flags", { key: row.key, enabled: !row.enabled });
    refetch();
  }

  const columns: DataColumn<FeatureFlagRow>[] = [
    { id: "key", header: "Flag", isPrimary: true, cell: (row) => row.name ?? row.key },
    { id: "keyRaw", header: "Key", cell: (row) => <code className="text-xs">{row.key}</code>, hideBelow: "lg" },
    {
      id: "enabled",
      header: "Status",
      cell: (row) => <Badge variant={row.enabled ? "success" : "secondary"}>{row.enabled ? "Enabled" : "Disabled"}</Badge>,
    },
  ];

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader
        title="Feature Flags"
        description="Global defaults. Studio-specific overrides are managed from each studio's detail page."
      />
      <ResponsiveDataView
        columns={columns}
        rows={data ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderRowActions={(row) => (
          <Button size="sm" variant="outline" onClick={() => toggle(row)}>
            {row.enabled ? "Disable" : "Enable"}
          </Button>
        )}
      />
    </ResponsiveContentContainer>
  );
}
