"use client";

import * as React from "react";
import { Plus, Zap } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";
import { RuleEditorDialog } from "../../components/automation/rule-editor-dialog";

const TRIGGER_TYPES = [
  { value: "lead_created", label: "Lead created" }, { value: "lead_inactive", label: "Lead inactive" }, { value: "follow_up_due", label: "Follow-up due" },
  { value: "quotation_sent", label: "Quotation sent" }, { value: "quotation_viewed", label: "Quotation viewed" }, { value: "quotation_accepted", label: "Quotation accepted" },
  { value: "booking_confirmed", label: "Booking confirmed" }, { value: "payment_due", label: "Payment due" }, { value: "payment_overdue", label: "Payment overdue" },
  { value: "event_upcoming", label: "Event upcoming" }, { value: "gallery_published", label: "Gallery published" }, { value: "selection_pending", label: "Selection pending" },
  { value: "album_approved", label: "Album approved" }, { value: "delivery_completed", label: "Delivery completed" }, { value: "birthday", label: "Birthday" }, { value: "anniversary", label: "Anniversary" },
];

interface RuleRecord { id: string; name: string; triggerType: string; isActive: boolean }

export default function AutomationPage() {
  const [rules, setRules] = React.useState<RuleRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [triggerType, setTriggerType] = React.useState("lead_created");
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<RuleRecord[]>("/automation/rules");
    if (res.ok && res.data) setRules(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim()) return;
    const res = await apiPost<RuleRecord>("/automation/rules", { name, triggerType });
    setName("");
    await load();
    if (res.ok && res.data) setDetailId(res.data.id);
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 flex items-center gap-2 font-display text-2xl"><Zap className="h-5 w-5" aria-hidden="true" />Automation Builder</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Input placeholder="Automation name" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
        <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} options={TRIGGER_TYPES} className="w-52" />
        <Button type="button" size="sm" onClick={() => void handleCreate()}><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Create</Button>
      </div>

      {loading ? (
        <LoadingState label="Loading automations…" />
      ) : rules.length === 0 ? (
        <EmptyState title="No automations yet" description="Create one above, then add steps in the visual editor." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {rules.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setDetailId(r.id)} className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-accent">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.triggerType.replace(/_/g, " ")}</p>
                </div>
                <Badge variant={r.isActive ? "success" : "outline"}>{r.isActive ? "Enabled" : "Disabled"}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      <RuleEditorDialog ruleId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
