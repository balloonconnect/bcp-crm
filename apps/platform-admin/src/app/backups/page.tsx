"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPost } from "../../lib/api-client";

interface BackupRow {
  id: string;
  status: string;
  sizeBytes: number | null;
  requestedAt: string;
  studio: { name: string; slug: string };
}
interface RestoreRow {
  id: string;
  status: string;
  requestedAt: string;
  studio: { name: string; slug: string };
}

const statusVariant: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  requested: "warning", pending_approval: "warning", approved: "secondary", processing: "secondary", completed: "success", rejected: "destructive", failed: "destructive",
};

export default function BackupsPage() {
  const { data: backupsData, loading: backupsLoading, refetch: refetchBackups } = useApiGet<BackupRow[]>("/platform/backups");
  const { data: restoresData, loading: restoresLoading, refetch: refetchRestores } = useApiGet<RestoreRow[]>("/platform/restores");

  async function decideBackup(id: string, approve: boolean) {
    const rejectedReason = approve ? undefined : window.prompt("Reason for rejecting this backup request:") ?? undefined;
    await apiPost(`/platform/backups/${id}/decide`, { approve, rejectedReason });
    refetchBackups();
  }

  async function decideRestore(id: string, approve: boolean) {
    const rejectedReason = approve ? undefined : window.prompt("Reason for rejecting this restore request:") ?? undefined;
    await apiPost(`/platform/restores/${id}/decide`, { approve, rejectedReason });
    refetchRestores();
  }

  const backupColumns: DataColumn<BackupRow>[] = [
    { id: "studio", header: "Studio", isPrimary: true, cell: (row) => row.studio.name },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status] ?? "secondary"}>{row.status.replace(/_/g, " ")}</Badge> },
    { id: "size", header: "Size", cell: (row) => (row.sizeBytes ? `${(row.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "—"), hideBelow: "lg" },
    { id: "requestedAt", header: "Requested", cell: (row) => new Date(row.requestedAt).toLocaleString("en-IN"), hideBelow: "md" },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        row.status === "pending_approval" || row.status === "requested" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => decideBackup(row.id, true)}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => decideBackup(row.id, false)}>Reject</Button>
          </div>
        ) : null,
    },
  ];

  const restoreColumns: DataColumn<RestoreRow>[] = [
    { id: "studio", header: "Studio", isPrimary: true, cell: (row) => row.studio.name },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status] ?? "secondary"}>{row.status.replace(/_/g, " ")}</Badge> },
    { id: "requestedAt", header: "Requested", cell: (row) => new Date(row.requestedAt).toLocaleString("en-IN"), hideBelow: "md" },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        row.status === "pending_approval" || row.status === "requested" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => decideRestore(row.id, true)}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => decideRestore(row.id, false)}>Reject</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader
        title="Studio Backups & Restores"
        description="Every backup and restore request requires explicit platform admin approval before it runs — a studio can request, but never approve, its own."
      />
      <h2 className="mb-2 mt-6 text-lg font-semibold">Backup requests</h2>
      <ResponsiveDataView rows={backupsData ?? []} columns={backupColumns} isLoading={backupsLoading} getRowId={(row) => row.id} emptyState={<p className="text-sm text-muted-foreground">No backup requests yet.</p>} />

      <h2 className="mb-2 mt-8 text-lg font-semibold">Restore requests</h2>
      <ResponsiveDataView rows={restoresData ?? []} columns={restoreColumns} isLoading={restoresLoading} getRowId={(row) => row.id} emptyState={<p className="text-sm text-muted-foreground">No restore requests yet.</p>} />
    </ResponsiveContentContainer>
  );
}
