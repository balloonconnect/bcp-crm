"use client";

import * as React from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@bcp/ui";
import { apiGet, apiFetch } from "../../../lib/api-client";

interface LeadAttachment {
  id: string;
  fileName: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LeadAttachmentsTab({ leadId }: { leadId: string }) {
  const [items, setItems] = React.useState<LeadAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await apiGet<LeadAttachment[]>(`/leads/${leadId}/attachments`);
    if (res.ok && res.data) setItems(res.data);
  }, [leadId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await apiFetch(`/leads/${leadId}/attachments`, { method: "POST", body: formData });
    await load();
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(attachmentId: string) {
    await apiFetch(`/leads/${leadId}/attachments/${attachmentId}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="flex min-h-touch-target w-fit cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-accent">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          {uploading ? "Uploading…" : "Attach a file"}
          <input type="file" className="sr-only" onChange={(e) => void handleUpload(e)} disabled={uploading} />
        </label>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {items.length === 0 && <p className="py-4 text-sm text-muted-foreground">No attachments yet.</p>}
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
            <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-brand hover:underline">
              {item.fileName}
            </a>
            <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.sizeBytes)}</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Delete ${item.fileName}`} onClick={() => void handleDelete(item.id)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
