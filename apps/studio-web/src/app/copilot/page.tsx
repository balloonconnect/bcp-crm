"use client";

import * as React from "react";
import { Send, Check, X, RotateCcw, FileText, Sparkles } from "lucide-react";
import { Button, Input, Badge } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface SourceRef { type: string; id: string }
interface Message { id: string; role: "user" | "assistant"; content: string; sourceReferences: SourceRef[] | null; createdAt: string }
interface CopilotAction { id: string; actionType: string; status: string; payload: Record<string, unknown>; resultData: Record<string, unknown> | null; isReversible: boolean }
interface Conversation { id: string; messages: Message[]; actions: CopilotAction[] }

const ACTION_LABELS: Record<string, string> = { create_quotation: "Create quotation", draft_payment_reminder: "Draft payment reminder", create_shot_list: "Create shot list" };

export default function CopilotPage() {
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [actions, setActions] = React.useState<CopilotAction[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function refreshConversation(id: string) {
    const res = await apiGet<Conversation>(`/copilot/conversations/${id}`);
    if (res.ok && res.data) {
      setMessages(res.data.messages);
      setActions(res.data.actions);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, role: "user", content, sourceReferences: null, createdAt: new Date().toISOString() }]);

    const res = await apiPost<{ conversationId: string }>("/copilot/messages", { conversationId: conversationId ?? undefined, content });
    setSending(false);
    if (res.ok && res.data) {
      setConversationId(res.data.conversationId);
      await refreshConversation(res.data.conversationId);
    }
  }

  async function handleConfirm(actionId: string) {
    await apiPost(`/copilot/actions/${actionId}/confirm`);
    if (conversationId) await refreshConversation(conversationId);
  }

  async function handleReject(actionId: string) {
    await apiPost(`/copilot/actions/${actionId}/reject`);
    if (conversationId) await refreshConversation(conversationId);
  }

  async function handleReverse(actionId: string) {
    await apiPost(`/copilot/actions/${actionId}/reverse`);
    if (conversationId) await refreshConversation(conversationId);
  }

  const pendingActions = actions.filter((a) => a.status === "draft");

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-2xl flex-col p-4 sm:p-6">
      <h1 className="mb-4 flex items-center gap-2 font-display text-2xl"><Sparkles className="h-5 w-5" aria-hidden="true" />Studio Copilot</h1>

      <div className="flex-1 overflow-y-auto rounded-md border border-border p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p>Try asking:</p>
            <p className="italic">&quot;Show tomorrow&apos;s events&quot; or &quot;Which clients haven&apos;t selected album photos?&quot;</p>
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-md p-3 text-sm ${m.role === "user" ? "ml-auto bg-brand text-brand-foreground" : "bg-muted"}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sourceReferences && m.sourceReferences.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.sourceReferences.map((ref, i) => (
                    <Badge key={i} variant="outline" className="text-xs"><FileText className="mr-1 h-3 w-3" aria-hidden="true" />{ref.type}</Badge>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>

      {pendingActions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {pendingActions.map((a) => (
            <div key={a.id} className="rounded-md border border-border bg-accent p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{ACTION_LABELS[a.actionType] ?? a.actionType}</span>
                <Badge variant="warning">Draft — awaiting confirmation</Badge>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void handleConfirm(a.id)}><Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Confirm</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void handleReject(a.id)}><X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {actions.filter((a) => a.status === "executed" && a.isReversible).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.filter((a) => a.status === "executed" && a.isReversible).map((a) => (
            <Button key={a.id} type="button" size="sm" variant="ghost" onClick={() => void handleReverse(a.id)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Undo {ACTION_LABELS[a.actionType] ?? a.actionType}
            </Button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input placeholder="Ask the copilot…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleSend()} disabled={sending} />
        <Button type="button" onClick={() => void handleSend()} disabled={sending}><Send className="h-4 w-4" aria-hidden="true" /></Button>
      </div>
    </main>
  );
}
