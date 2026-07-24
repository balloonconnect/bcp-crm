"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Select, Textarea, Button } from "@bcp/ui";
import { apiPost } from "../../lib/api-client";

const PRIORITY_OPTIONS = [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }];

export function TaskTemplateFormDialog({ workflowTemplateId, open, onOpenChange, onSaved }: { workflowTemplateId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [stageKey, setStageKey] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [defaultAssigneeRole, setDefaultAssigneeRole] = React.useState("");
  const [defaultDueOffsetDays, setDefaultDueOffsetDays] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [isApprovalStep, setIsApprovalStep] = React.useState(false);
  const [slaHours, setSlaHours] = React.useState("");
  const [checklistText, setChecklistText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setStageKey(""); setName(""); setDescription(""); setDefaultAssigneeRole(""); setDefaultDueOffsetDays("");
      setPriority("medium"); setIsApprovalStep(false); setSlaHours(""); setChecklistText(""); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workflowTemplateId) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      stageKey: stageKey || name.toLowerCase().replace(/\s+/g, "_"),
      name,
      description: description || undefined,
      defaultAssigneeRole: defaultAssigneeRole || undefined,
      defaultDueOffsetDays: defaultDueOffsetDays ? Number(defaultDueOffsetDays) : undefined,
      priority,
      isApprovalStep,
      slaHours: slaHours ? Number(slaHours) : undefined,
      checklistItems: checklistText.split(",").map((c) => c.trim()).filter(Boolean),
    };

    const res = await apiPost(`/workflow-templates/${workflowTemplateId}/tasks`, payload);
    if (!res.ok) {
      setError(res.error?.message ?? "Could not add this task");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New task template">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "template",
              columns: 2,
              children: (
                <>
                  <FormField label="Name" htmlFor="tt-name" required fullWidth><Input id="tt-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
                  <FormField label="Stage key" htmlFor="tt-stage" hint="Defaults from the name if left blank"><Input id="tt-stage" value={stageKey} onChange={(e) => setStageKey(e.target.value)} /></FormField>
                  <FormField label="Priority" htmlFor="tt-priority"><Select id="tt-priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITY_OPTIONS} /></FormField>
                  <FormField label="Default assignee role" htmlFor="tt-role" hint="e.g. photographer"><Input id="tt-role" value={defaultAssigneeRole} onChange={(e) => setDefaultAssigneeRole(e.target.value)} /></FormField>
                  <FormField label="Due offset (days)" htmlFor="tt-offset" hint="Relative to the shoot date; negative = before"><Input id="tt-offset" type="number" value={defaultDueOffsetDays} onChange={(e) => setDefaultDueOffsetDays(e.target.value)} /></FormField>
                  <FormField label="SLA (hours)" htmlFor="tt-sla"><Input id="tt-sla" type="number" min="1" value={slaHours} onChange={(e) => setSlaHours(e.target.value)} /></FormField>
                  <label className="col-span-full flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isApprovalStep} onChange={(e) => setIsApprovalStep(e.target.checked)} />
                    Requires approval
                  </label>
                  <FormField label="Description" htmlFor="tt-description" fullWidth><Textarea id="tt-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                  <FormField label="Checklist" htmlFor="tt-checklist" hint="Comma-separated" fullWidth><Input id="tt-checklist" value={checklistText} onChange={(e) => setChecklistText(e.target.value)} /></FormField>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add task"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
