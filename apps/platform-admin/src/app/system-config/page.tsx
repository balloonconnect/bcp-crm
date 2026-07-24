"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export default function SystemConfigPage() {
  const { data, loading } = useApiGet<SettingRow[]>("/platform/system-config");

  const columns: DataColumn<SettingRow>[] = [
    { id: "key", header: "Key", isPrimary: true, cell: (row) => row.key },
    { id: "value", header: "Value", cell: (row) => <code className="text-xs">{JSON.stringify(row.value)}</code> },
    { id: "updatedAt", header: "Updated", cell: (row) => new Date(row.updatedAt).toLocaleString(), align: "end", hideBelow: "lg" },
  ];

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader
        title="System Configuration"
        description="Platform-wide key/value settings (maintenance windows, default trial length, and similar)."
      />
      <ResponsiveDataView
        columns={columns}
        rows={data ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyState={<p className="p-8 text-center text-sm text-muted-foreground">No custom settings yet — everything is on platform defaults.</p>}
      />
    </ResponsiveContentContainer>
  );
}
