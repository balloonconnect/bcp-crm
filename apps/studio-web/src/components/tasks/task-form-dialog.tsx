"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { apiPost } from "../../lib/api-client";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" },
];

export function TaskFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [slaHours, setSlaHours] = React.useState("");
  const [checklistText, setChecklistText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setDueDate(""); setPriority("medium"); setSlaHours(""); setChecklistText("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      priority,
      slaHours: slaHours ? Number(slaHours) : undefined,
      checklistItems: checklistText.split(",").map((c) => c.trim()).filter(Boolean),
    };

    const res = await apiPost("/tasks", payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not create this task");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "task",
              columns: 2,
              children: (
                <>
                  <FormField label="Title" htmlFor="tf-title" required fullWidth><Input id="tf-title" value={title} onChange={(e) => setTitle(e.target.value)} required /></FormField>
                  <FormField label="Description" htmlFor="tf-description" fullWidth><Textarea id="tf-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                  <FormField label="Due date" htmlFor="tf-due"><Input id="tf-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></FormField>
                  <FormField label="Priority" htmlFor="tf-priority"><Select id="tf-priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITY_OPTIONS} /></FormField>
                  <FormField label="SLA (hours)" htmlFor="tf-sla"><Input id="tf-sla" type="number" min="1" value={slaHours} onChange={(e) => setSlaHours(e.target.value)} /></FormField>
                  <FormField label="Checklist" htmlFor="tf-checklist" hint="Comma-separated" fullWidth><Input id="tf-checklist" value={checklistText} onChange={(e) => setChecklistText(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create task"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
