"use client";

import * as React from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input, Textarea, Select } from "@bcp/ui";
import { apiGet, apiPost, apiPatch, apiFetch } from "../../lib/api-client";

interface ChecklistItem { id: string; description: string; completed: boolean }
interface Comment { id: string; body: string; createdAt: string }
interface Attachment { id: string; fileName: string; createdAt: string }
interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  slaDeadline: string | null;
  escalatedAt: string | null;
  isApprovalStep: boolean;
  approvalStatus: string;
  assignee: { id: string; name: string } | null;
  checklistItems: ChecklistItem[];
  comments: Comment[];
  attachments: Attachment[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" }, { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
];
const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive" | "secondary"> = { low: "outline", medium: "secondary", high: "warning", urgent: "destructive" };

export function TaskDetailDialog({ taskId, open, onOpenChange, onChanged }: { taskId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const [newComment, setNewComment] = React.useState("");

  const load = React.useCallback(async () => {
    if (!taskId) return;
    const res = await apiGet<TaskDetail>(`/tasks/${taskId}`);
    if (res.ok && res.data) setTask(res.data);
  }, [taskId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleStatusChange(status: string) {
    if (!taskId) return;
    await apiPatch(`/tasks/${taskId}/status`, { status });
    await load();
    onChanged();
  }

  async function handleApproval(decision: "approved" | "rejected") {
    if (!taskId) return;
    await apiPost(`/tasks/${taskId}/approval`, { decision });
    await load();
    onChanged();
  }

  async function handleAddChecklistItem() {
    if (!taskId || !newChecklistItem.trim()) return;
    await apiPost(`/tasks/${taskId}/checklist`, { description: newChecklistItem });
    setNewChecklistItem("");
    await load();
  }

  async function handleToggleChecklistItem(itemId: string, completed: boolean) {
    if (!taskId) return;
    await apiPatch(`/tasks/${taskId}/checklist/${itemId}`, { completed });
    await load();
  }

  async function handleRemoveChecklistItem(itemId: string) {
    if (!taskId) return;
    await apiFetch(`/tasks/${taskId}/checklist/${itemId}`, { method: "DELETE" });
    await load();
  }

  async function handleAddComment() {
    if (!taskId || !newComment.trim()) return;
    await apiPost(`/tasks/${taskId}/comments`, { body: newComment });
    setNewComment("");
    await load();
  }

  if (!task) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={task.title} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"} className="capitalize">{task.priority}</Badge>
          <Select value={task.status} onChange={(e) => void handleStatusChange(e.target.value)} options={STATUS_OPTIONS} className="w-auto" />
          {task.escalatedAt && (
            <span className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Escalated</span>
          )}
        </div>

        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {task.assignee && <p><span className="text-muted-foreground">Assignee:</span> {task.assignee.name}</p>}
          {task.dueDate && <p><span className="text-muted-foreground">Due:</span> {new Date(task.dueDate).toLocaleString("en-IN")}</p>}
          {task.slaDeadline && <p><span className="text-muted-foreground">SLA deadline:</span> {new Date(task.slaDeadline).toLocaleString("en-IN")}</p>}
        </div>

        {task.isApprovalStep && task.approvalStatus === "pending" && (
          <div className="flex gap-2 rounded-md border border-border p-3">
            <p className="flex-1 self-center text-sm">This task requires approval.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleApproval("rejected")}>Reject</Button>
            <Button type="button" size="sm" onClick={() => void handleApproval("approved")}>Approve</Button>
          </div>
        )}
        {task.isApprovalStep && task.approvalStatus !== "pending" && task.approvalStatus !== "not_required" && (
          <Badge variant={task.approvalStatus === "approved" ? "success" : "destructive"} className="w-fit capitalize">{task.approvalStatus}</Badge>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Checklist</h3>
          <ul className="mb-2 flex flex-col gap-1.5">
            {task.checklistItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <input type="checkbox" checked={item.completed} onChange={(e) => void handleToggleChecklistItem(item.id, e.target.checked)} />
                <span className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : ""}`}>{item.description}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleRemoveChecklistItem(item.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Add a checklist item" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void handleAddChecklistItem()}><Plus className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Comments</h3>
          <ul className="mb-2 flex flex-col gap-2">
            {task.comments.map((comment) => (
              <li key={comment.id} className="rounded-md border border-border p-2 text-sm">
                <p>{comment.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString("en-IN")}</p>
              </li>
            ))}
            {task.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
          </ul>
          <div className="flex gap-2">
            <Textarea placeholder="Add a comment" rows={2} value={newComment} onChange={(e) => setNewComment(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void handleAddComment()}>Post</Button>
          </div>
        </div>

        {task.attachments.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Attachments</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {task.attachments.map((a) => <li key={a.id}>{a.fileName}</li>)}
            </ul>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
