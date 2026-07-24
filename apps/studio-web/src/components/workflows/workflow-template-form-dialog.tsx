"use client";

import * as React from "react";
import { ResponsiveDialog, ResponsiveFormLayout, FormField, Input, Textarea, Button } from "@bcp/ui";
import { apiPost } from "../../lib/api-client";

export function WorkflowTemplateFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [name, setName] = React.useState("");
  const [eventType, setEventType] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName(""); setEventType(""); setDescription(""); setIsDefault(false); setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await apiPost("/workflow-templates", { name, eventType: eventType || undefined, description: description || undefined, isDefault });
    if (!res.ok) {
      setError(res.error?.message ?? "Could not create this workflow");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="New workflow template">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ResponsiveFormLayout
          sections={[
            {
              id: "template",
              columns: 1,
              children: (
                <>
                  <FormField label="Name" htmlFor="wt-name" required><Input id="wt-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
                  <FormField label="Event type" htmlFor="wt-event-type" hint="Leave blank to apply this workflow to any event type"><Input id="wt-event-type" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. Wedding" /></FormField>
                  <FormField label="Description" htmlFor="wt-description"><Textarea id="wt-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                    Make this the studio&apos;s default workflow
                  </label>
                </>
              ),
            },
          ]}
        />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create workflow"}</Button>
      </form>
    </ResponsiveDialog>
  );
}
