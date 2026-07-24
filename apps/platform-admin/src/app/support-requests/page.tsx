"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPost } from "../../lib/api-client";

interface SupportRequestRow {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  studio: { name: string; slug: string };
}

interface SupportRequestsResponse {
  items: SupportRequestRow[];
  total: number;
}

const statusVariant: Record<SupportRequestRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  open: "warning",
  in_progress: "secondary",
  resolved: "success",
  closed: "secondary",
};

export default function SupportRequestsPage() {
  const { data, loading, refetch } = useApiGet<SupportRequestsResponse>("/platform/support-requests");

  const columns: DataColumn<SupportRequestRow>[] = [
    { id: "subject", header: "Subject", isPrimary: true, cell: (row) => row.subject },
    { id: "studio", header: "Studio", cell: (row) => row.studio.name },
    { id: "priority", header: "Priority", cell: (row) => row.priority, hideBelow: "lg" },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status.replace("_", " ")}</Badge> },
  ];

  async function resolve(id: string) {
    await apiPost(`/platform/support-requests/${id}/resolve`);
    refetch();
  }

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Support Requests" description="Support tickets raised by studios." />
      <ResponsiveDataView
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        renderRowActions={(row) =>
          row.status !== "resolved" && row.status !== "closed" ? (
            <Button size="sm" variant="outline" onClick={() => resolve(row.id)}>
              Mark resolved
            </Button>
          ) : null
        }
      />
    </ResponsiveContentContainer>
  );
}
