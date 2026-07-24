"use client";

import * as React from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { Button, Badge, ResponsiveDataView, LoadingState, EmptyState, type DataColumn } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { TaskFormDialog } from "../../components/tasks/task-form-dialog";
import { TaskDetailDialog } from "../../components/tasks/task-detail-dialog";

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  escalatedAt: string | null;
  assignee: { name: string } | null;
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive" | "secondary"> = {
  pending: "outline", in_progress: "secondary", blocked: "warning", completed: "success", cancelled: "destructive",
};
const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive" | "secondary"> = { low: "outline", medium: "secondary", high: "warning", urgent: "destructive" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "completed", label: "Completed" },
];

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<TaskSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [showOverdue, setShowOverdue] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (showOverdue) params.set("overdue", "true");
    const res = await apiGet<TaskSummary[]>(`/tasks?${params.toString()}`);
    if (res.ok && res.data) setTasks(res.data);
    setLoading(false);
  }, [statusFilter, showOverdue]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const columns: DataColumn<TaskSummary>[] = [
    {
      id: "title",
      header: "Task",
      cell: (row) => (
        <span className="flex items-center gap-1.5">
          {row.escalatedAt && <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />}
          {row.title}
        </span>
      ),
      isPrimary: true,
    },
    { id: "assignee", header: "Assignee", cell: (row) => row.assignee?.name ?? "Unassigned", hideBelow: "sm" },
    { id: "due", header: "Due", cell: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "—"), hideBelow: "md" },
    { id: "priority", header: "Priority", cell: (row) => <Badge variant={PRIORITY_VARIANT[row.priority] ?? "outline"} className="capitalize">{row.priority}</Badge> },
    { id: "status", header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? "outline"} className="capitalize">{row.status.replace(/_/g, " ")}</Badge> },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Tasks</h1>
        <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New task
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${statusFilter === f.key ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            {f.label}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={showOverdue} onChange={(e) => setShowOverdue(e.target.checked)} />
          Overdue only
        </label>
      </div>

      {loading ? (
        <LoadingState label="Loading tasks…" />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks" description="Create a task, or apply a workflow to a booking to generate tasks automatically." />
      ) : (
        <ResponsiveDataView columns={columns} rows={tasks} getRowId={(row) => row.id} onRowClick={(row) => setDetailId(row.id)} />
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <TaskDetailDialog taskId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
