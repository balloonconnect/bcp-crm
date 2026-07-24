"use client";

import * as React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Badge, Button } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Message {
  id: string;
  toPhone: string;
  messageType: string;
  status: string;
  failureReason: string | null;
  retryCount: number;
  queuedAt: string;
}
interface Usage { used: number; limit: number | null }

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { queued: "outline", sent: "outline", delivered: "success", read: "success", failed: "destructive" };

export function MessagesTab() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [usage, setUsage] = React.useState<Usage | null>(null);

  const load = React.useCallback(async () => {
    const [messagesRes, usageRes] = await Promise.all([apiGet<Message[]>("/whatsapp/messages"), apiGet<Usage>("/whatsapp/usage")]);
    if (messagesRes.ok && messagesRes.data) setMessages(messagesRes.data);
    if (usageRes.ok && usageRes.data) setUsage(usageRes.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleRetry(id: string) {
    await apiPost(`/whatsapp/messages/${id}/retry`);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      {usage && (
        <p className="text-sm text-muted-foreground">
          {usage.used.toLocaleString("en-IN")} messages sent this month{usage.limit !== null ? ` of ${usage.limit.toLocaleString("en-IN")}` : " (unlimited plan)"}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-border">
        {messages.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
            <div className="flex min-w-0 flex-col">
              <span>{m.toPhone} · <span className="capitalize">{m.messageType}</span></span>
              <span className="text-xs text-muted-foreground">{new Date(m.queuedAt).toLocaleString("en-IN")}</span>
              {m.failureReason && <span className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{m.failureReason}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[m.status] ?? "outline"} className="capitalize">{m.status}</Badge>
              {m.status === "failed" && m.retryCount < 3 && (
                <Button type="button" variant="outline" size="sm" onClick={() => void handleRetry(m.id)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Retry</Button>
              )}
            </div>
          </li>
        ))}
        {messages.length === 0 && <p className="py-4 text-sm text-muted-foreground">No messages sent yet.</p>}
      </ul>
    </div>
  );
}
