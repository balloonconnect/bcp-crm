"use client";

import * as React from "react";
import { Button, Textarea } from "@bcp/ui";
import { apiGet, apiPost } from "../../../lib/api-client";

interface LeadNote {
  id: string;
  body: string;
  createdAt: string;
}

export function LeadNotesTab({ leadId }: { leadId: string }) {
  const [notes, setNotes] = React.useState<LeadNote[]>([]);
  const [draft, setDraft] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await apiGet<LeadNote[]>(`/leads/${leadId}/notes`);
    if (res.ok && res.data) setNotes(res.data);
  }, [leadId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSubmitting(true);
    await apiPost(`/leads/${leadId}/notes`, { body: draft });
    setDraft("");
    await load();
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note…" />
        <Button type="button" size="sm" className="self-end" disabled={submitting || !draft.trim()} onClick={() => void handleAdd()}>
          Add note
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {notes.length === 0 && <p className="py-4 text-sm text-muted-foreground">No notes yet.</p>}
        {notes.map((note) => (
          <li key={note.id} className="py-3">
            <p className="whitespace-pre-wrap text-sm">{note.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString("en-IN")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
