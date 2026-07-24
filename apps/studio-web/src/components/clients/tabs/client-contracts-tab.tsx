"use client";

import * as React from "react";
import { Badge, Button, FormField, Input, Select } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../../lib/api-client";

interface Contract {
  id: string;
  title: string;
  status: string;
  signedAt: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "signed", label: "Signed" }, { value: "void", label: "Void" },
];
const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { draft: "outline", sent: "warning", signed: "success", void: "destructive" };

export function ClientContractsTab({ clientId }: { clientId: string }) {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [title, setTitle] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await apiGet<Contract[]>(`/clients/${clientId}/contracts`);
    if (res.ok && res.data) setContracts(res.data);
  }, [clientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!title.trim()) return;
    setSubmitting(true);
    await apiPost(`/clients/${clientId}/contracts`, { title });
    setTitle("");
    await load();
    setSubmitting(false);
  }

  async function handleStatusChange(contractId: string, status: string) {
    await apiPatch(`/clients/${clientId}/contracts/${contractId}/status`, { status });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2 rounded-md border border-border p-3">
        <FormField label="New contract title" htmlFor="contract-title" fullWidth>
          <Input id="contract-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wedding photography agreement" />
        </FormField>
        <Button type="button" size="sm" disabled={submitting || !title.trim()} onClick={() => void handleAdd()}>
          Add
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {contracts.length === 0 && <p className="py-4 text-sm text-muted-foreground">No contracts yet.</p>}
        {contracts.map((contract) => (
          <li key={contract.id} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{contract.title}</p>
              <p className="text-xs text-muted-foreground">{contract.signedAt ? `Signed ${new Date(contract.signedAt).toLocaleDateString("en-IN")}` : `Created ${new Date(contract.createdAt).toLocaleDateString("en-IN")}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[contract.status] ?? "outline"}>{contract.status}</Badge>
              <Select value={contract.status} onChange={(e) => void handleStatusChange(contract.id, e.target.value)} options={STATUS_OPTIONS} className="w-auto" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
