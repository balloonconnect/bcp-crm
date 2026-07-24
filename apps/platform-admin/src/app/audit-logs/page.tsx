"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";

interface AuditLogRow {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  items: AuditLogRow[];
  total: number;
}

export default function AuditLogsPage() {
  const { data, loading } = useApiGet<AuditLogResponse>("/platform/audit-logs");

  const columns: DataColumn<AuditLogRow>[] = [
    { id: "action", header: "Action", isPrimary: true, cell: (row) => row.action },
    {
      id: "resource",
      header: "Resource",
      cell: (row) => `${row.resourceType}${row.resourceId ? ` (${row.resourceId.slice(0, 8)}…)` : ""}`,
    },
    {
      id: "actor",
      header: "Actor",
      cell: (row) => `${row.actorType}${row.actorId ? ` ${row.actorId.slice(0, 8)}…` : ""}`,
      hideBelow: "lg",
    },
    { id: "createdAt", header: "When", cell: (row) => new Date(row.createdAt).toLocaleString(), align: "end" },
  ];

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Audit Logs" description="Every platform- and studio-level action, in one searchable trail." />
      <ResponsiveDataView columns={columns} rows={data?.items ?? []} getRowId={(row) => row.id} isLoading={loading} />
    </ResponsiveContentContainer>
  );
}
