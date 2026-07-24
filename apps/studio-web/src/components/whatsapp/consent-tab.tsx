"use client";

import * as React from "react";
import { Badge, Button, Input, Select } from "@bcp/ui";
import { apiGet, apiPut } from "../../lib/api-client";

interface OptStatus { id: string; phone: string; status: string; updatedAt: string }

const STATUS_OPTIONS = [{ value: "unknown", label: "Unknown" }, { value: "opted_in", label: "Opted in" }, { value: "opted_out", label: "Opted out" }];
const STATUS_VARIANT: Record<string, "outline" | "success" | "destructive"> = { unknown: "outline", opted_in: "success", opted_out: "destructive" };

export function ConsentTab() {
  const [statuses, setStatuses] = React.useState<OptStatus[]>([]);
  const [phone, setPhone] = React.useState("");
  const [status, setStatus] = React.useState("opted_in");

  const load = React.useCallback(async () => {
    const res = await apiGet<OptStatus[]>("/whatsapp/opt-statuses");
    if (res.ok && res.data) setStatuses(res.data);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleSet() {
    if (!phone.trim()) return;
    await apiPut("/whatsapp/opt-statuses", { phone, status });
    setPhone("");
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border">
        {statuses.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-1.5 text-sm">
            <span>{s.phone}</span>
            <Badge variant={STATUS_VARIANT[s.status] ?? "outline"} className="capitalize">{s.status.replace(/_/g, " ")}</Badge>
          </li>
        ))}
        {statuses.length === 0 && <p className="py-2 text-xs text-muted-foreground">No opt-in/opt-out records yet — numbers default to unknown, which still allows sending.</p>}
      </ul>
      <div className="flex gap-2">
        <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} className="w-36" />
        <Button type="button" size="sm" onClick={() => void handleSet()}>Set</Button>
      </div>
    </div>
  );
}
