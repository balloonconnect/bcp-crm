"use client";

import * as React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Badge, Button } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Message { id: string; toAddress: string; subject: string; status: string; failureReason: string | null; retryCount: number; queuedAt: string }

const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive"> = { queued: "outline", sent: "outline", delivered: "success", bounced: "destructive", failed: "destructive" };

export function MessagesTab() {
  const [messages, setMessages] = React.useState<Message[]>([]);

  const load = React.useCallback(async () => {
    const res = await apiGet<Message[]>("/email/messages");
    if (res.ok && res.data) setMessages(res.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleRetry(id: string) {
    await apiPost(`/email/messages/${id}/retry`);
    await load();
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {messages.map((m) => (
        <li key={m.id} className="flex items-center justify-between py-2 text-sm">
          <div className="flex min-w-0 flex-col">
            <span>{m.toAddress} · {m.subject}</span>
            <span className="text-xs text-muted-foreground">{new Date(m.queuedAt).toLocaleString("en-IN")}</span>
            {m.failureReason && <span className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{m.failureReason}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[m.status] ?? "outline"} className="capitalize">{m.status}</Badge>
            {(m.status === "failed") && m.retryCount < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={() => void handleRetry(m.id)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Retry</Button>
            )}
          </div>
        </li>
      ))}
      {messages.length === 0 && <p className="py-4 text-sm text-muted-foreground">No emails sent yet.</p>}
    </ul>
  );
}
