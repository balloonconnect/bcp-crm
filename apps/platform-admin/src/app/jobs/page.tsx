"use client";

import { ResponsiveContentContainer, ResponsivePageHeader, ResponsiveDataView, Badge, Button, type DataColumn } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPost } from "../../lib/api-client";

interface JobRow {
  id: string;
  queue: string;
  jobName: string;
  status: "queued" | "running" | "completed" | "failed" | "retrying" | "cancelled";
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: string;
}

interface JobsResponse {
  items: JobRow[];
  total: number;
}

const statusVariant: Record<JobRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  queued: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
  retrying: "warning",
  cancelled: "secondary",
};

export default function JobsPage() {
  const { data, loading, refetch } = useApiGet<JobsResponse>("/platform/jobs?status=failed");

  const columns: DataColumn<JobRow>[] = [
    { id: "jobName", header: "Job", isPrimary: true, cell: (row) => row.jobName },
    { id: "queue", header: "Queue", cell: (row) => row.queue, hideBelow: "lg" },
    { id: "status", header: "Status", cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge> },
    { id: "attempts", header: "Attempts", cell: (row) => `${row.attempts}/${row.maxAttempts}`, align: "end" },
    { id: "error", header: "Error", cell: (row) => row.error ?? "—", hideBelow: "xl" },
  ];

  async function retry(jobId: string) {
    await apiPost(`/platform/jobs/${jobId}/retry`);
    refetch();
  }

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Job Monitoring" description="Failed background jobs. Retrying re-queues the job for the worker to pick up." />
      <ResponsiveDataView
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyState={<p className="p-8 text-center text-sm text-muted-foreground">No failed jobs — everything is healthy.</p>}
        renderRowActions={(row) => (
          <Button size="sm" variant="outline" onClick={() => retry(row.id)}>
            Retry
          </Button>
        )}
      />
    </ResponsiveContentContainer>
  );
}
