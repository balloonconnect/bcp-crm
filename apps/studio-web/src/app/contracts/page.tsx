"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";
import { TemplateBuilder } from "../../components/contracts/template-builder";
import { ContractDetailDialog } from "../../components/contracts/contract-detail-dialog";

interface Template { id: string; name: string; category: string | null }
interface ContractRecord { id: string; title: string; status: string }

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = { draft: "outline", sent: "warning", signed: "success", void: "destructive" };

export default function ContractsPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [contracts, setContracts] = React.useState<ContractRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showTemplateBuilder, setShowTemplateBuilder] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [templateId, setTemplateId] = React.useState("");
  const [witnessRequired, setWitnessRequired] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [templatesRes, contractsRes] = await Promise.all([apiGet<Template[]>("/contract-templates"), apiGet<ContractRecord[]>("/contracts")]);
    if (templatesRes.ok && templatesRes.data) setTemplates(templatesRes.data);
    if (contractsRes.ok && contractsRes.data) setContracts(contractsRes.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateContract() {
    if (!title.trim() || !clientId.trim()) return;
    await apiPost("/contracts", { title, clientId, templateId: templateId || undefined, witnessRequired });
    setTitle(""); setClientId(""); setTemplateId(""); setWitnessRequired(false);
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Contracts</h1>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowTemplateBuilder((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {showTemplateBuilder ? "Hide template builder" : "New template"}
        </Button>
      </div>

      {showTemplateBuilder && (
        <div className="mb-6">
          <TemplateBuilder onCreated={() => { setShowTemplateBuilder(false); void load(); }} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Input placeholder="Contract title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-56" />
        <Input placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-56" />
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} options={[{ value: "", label: "No template" }, ...templates.map((t) => ({ value: t.id, label: t.name }))]} className="w-48" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={witnessRequired} onChange={(e) => setWitnessRequired(e.target.checked)} />
          Witness required
        </label>
        <Button type="button" size="sm" onClick={() => void handleCreateContract()}>Create</Button>
      </div>

      {loading ? (
        <LoadingState label="Loading contracts…" />
      ) : contracts.length === 0 ? (
        <EmptyState title="No contracts yet" description="Create a template, then generate a contract for a client above." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {contracts.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setDetailId(c.id)} className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-accent">
                <span className="font-medium">{c.title}</span>
                <Badge variant={STATUS_VARIANT[c.status] ?? "outline"} className="capitalize">{c.status}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ContractDetailDialog contractId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
