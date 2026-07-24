"use client";

import * as React from "react";
import { Button, FormField, Input, Select, Textarea } from "@bcp/ui";
import { apiGet, apiPost } from "../../../lib/api-client";

interface ClientCommunication {
  id: string;
  channel: string;
  direction: string;
  summary: string;
  occurredAt: string;
}

const CHANNELS = [
  { value: "call", label: "Call" }, { value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" }, { value: "meeting", label: "Meeting" }, { value: "other", label: "Other" },
];
const DIRECTIONS = [
  { value: "outbound", label: "Outbound (we reached out)" },
  { value: "inbound", label: "Inbound (they reached out)" },
];

export function ClientCommunicationsTab({ clientId }: { clientId: string }) {
  const [items, setItems] = React.useState<ClientCommunication[]>([]);
  const [channel, setChannel] = React.useState("call");
  const [direction, setDirection] = React.useState("outbound");
  const [summary, setSummary] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await apiGet<ClientCommunication[]>(`/clients/${clientId}/communications`);
    if (res.ok && res.data) setItems(res.data);
  }, [clientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!summary.trim()) return;
    setSubmitting(true);
    await apiPost(`/clients/${clientId}/communications`, { channel, direction, summary, occurredAt: new Date(occurredAt).toISOString() });
    setSummary("");
    await load();
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
        <FormField label="Channel" htmlFor="ccomm-channel"><Select id="ccomm-channel" value={channel} onChange={(e) => setChannel(e.target.value)} options={CHANNELS} /></FormField>
        <FormField label="Direction" htmlFor="ccomm-direction"><Select id="ccomm-direction" value={direction} onChange={(e) => setDirection(e.target.value)} options={DIRECTIONS} /></FormField>
        <FormField label="When" htmlFor="ccomm-occurred-at"><Input id="ccomm-occurred-at" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} /></FormField>
        <FormField label="Summary" htmlFor="ccomm-summary" fullWidth><Textarea id="ccomm-summary" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} /></FormField>
        <Button type="button" size="sm" className="col-span-2 justify-self-end" disabled={submitting || !summary.trim()} onClick={() => void handleAdd()}>
          Log communication
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {items.length === 0 && <p className="py-4 text-sm text-muted-foreground">No communication logged yet.</p>}
        {items.map((item) => (
          <li key={item.id} className="py-3">
            <p className="text-sm font-medium capitalize">{item.direction === "inbound" ? "Received" : "Sent"} · {item.channel}</p>
            <p className="text-sm text-muted-foreground">{item.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(item.occurredAt).toLocaleString("en-IN")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
