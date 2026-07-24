"use client";

import * as React from "react";
import { Activity, X } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const QUEUE_OPTIONS = [
  { value: "", label: "All queues" },
  { value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" }, { value: "image-processing", label: "Image processing" },
  { value: "face-indexing", label: "Face indexing" }, { value: "ai-analysis", label: "AI analysis" }, { value: "pdf-generation", label: "PDF generation" },
  { value: "import", label: "Import" }, { value: "export", label: "Export" }, { value: "webhooks", label: "Webhooks" }, { value: "notifications", label: "Notifications" },
  { value: "retention-cleanup", label: "Retention cleanup" }, { value: "subscription-expiry", label: "Subscription expiry" },
  { value: "payment-reconciliation", label: "Payment reconciliation" }, { value: "backup", label: "Backup" },
];

interface JobRecord { id: string; queue: string; jobName: string; status: string; attempts: number; maxAttempts: number; error: string | null; createdAt: string }

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = {
  queued: "outline", running: "warning", retrying: "warning", completed: "success", failed: "destructive", dead_letter: "destructive", cancelled: "outline",
};

/**
 * "Studio-visible status" — every background job this studio's own
 * actions triggered (a queued email, an image being processed, an
 * export being generated), independent of anything happening in
 * platform-admin's own, separate monitoring view.
 */
export default function JobsPage() {
  const [jobs, setJobs] = React.useState<JobRecord[]>([]);
  const [queueFilter, setQueueFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<JobRecord[]>(`/jobs${queueFilter ? `?queue=${queueFilter}` : ""}`);
    if (res.ok && res.data) setJobs(res.data);
    setLoading(false);
  }, [queueFilter]);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000); // poll — a running/queued job's status can change without any action here
    return () => clearInterval(interval);
  }, [load]);

  async function handleCancel(id: string) {
    await apiPost(`/jobs/${id}/cancel`);
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 flex items-center gap-2 font-display text-2xl"><Activity className="h-5 w-5" aria-hidden="true" />Background Jobs</h1>

      <div className="mb-4">
        <Select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} options={QUEUE_OPTIONS} className="w-56" />
      </div>

      {loading ? (
        <LoadingState label="Loading jobs…" />
      ) : jobs.length === 0 ? (
        <EmptyState title="No background jobs yet" description="Emails, image processing, exports, and other background work will appear here." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium capitalize">{j.queue.replace(/-/g, " ")} — {j.jobName}</p>
                <p className="text-xs text-muted-foreground">{new Date(j.createdAt).toLocaleString("en-IN")} · attempt {j.attempts}/{j.maxAttempts}</p>
                {j.error && <p className="text-xs text-destructive">{j.error}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[j.status] ?? "outline"} className="capitalize">{j.status.replace(/_/g, " ")}</Badge>
                {(j.status === "queued" || j.status === "running" || j.status === "retrying") && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void handleCancel(j.id)}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
