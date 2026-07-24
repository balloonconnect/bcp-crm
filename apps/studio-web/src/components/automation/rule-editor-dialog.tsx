"use client";

import * as React from "react";
import { Plus, Play, FlaskConical, Trash2, ArrowRight, GitBranch } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Select, Textarea } from "@bcp/ui";
import { apiGet, apiPost, apiPatch, apiFetch } from "../../lib/api-client";

const ACTION_TYPES = [
  { value: "send_whatsapp", label: "Send WhatsApp" }, { value: "send_email", label: "Send email" }, { value: "create_task", label: "Create task" },
  { value: "assign_user", label: "Assign user" }, { value: "update_status", label: "Update status" }, { value: "add_tag", label: "Add tag" },
  { value: "generate_invoice", label: "Generate invoice" }, { value: "send_notification", label: "Send notification" }, { value: "call_webhook", label: "Call webhook" },
  { value: "wait", label: "Wait" }, { value: "condition_branch", label: "Condition branch" },
];

interface Step { id: string; actionType: string; actionConfig: Record<string, unknown> | null; nextStepId: string | null; conditionTrueStepId: string | null; conditionFalseStepId: string | null; isEntryPoint: boolean }
interface Rule { id: string; name: string; description: string | null; triggerType: string; isActive: boolean; steps: Step[] }
interface StepExecution { id: string; stepId: string; status: string; errorMessage: string | null }
interface Execution { id: string; status: string; isTestRun: boolean; errorMessage: string | null; startedAt: string; stepExecutions?: StepExecution[] }

export function RuleEditorDialog({ ruleId, open, onOpenChange, onChanged }: { ruleId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [rule, setRule] = React.useState<Rule | null>(null);
  const [executions, setExecutions] = React.useState<Execution[]>([]);
  const [newActionType, setNewActionType] = React.useState("send_whatsapp");
  const [newConfig, setNewConfig] = React.useState("{}");
  const [testContext, setTestContext] = React.useState("{}");
  const [testResult, setTestResult] = React.useState<Execution | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!ruleId) return;
    const [ruleRes, executionsRes] = await Promise.all([apiGet<Rule>(`/automation/rules/${ruleId}`), apiGet<Execution[]>(`/automation/executions?ruleId=${ruleId}`)]);
    if (ruleRes.ok && ruleRes.data) setRule(ruleRes.data);
    if (executionsRes.ok && executionsRes.data) setExecutions(executionsRes.data);
  }, [ruleId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleAddStep() {
    if (!ruleId) return;
    let actionConfig: Record<string, unknown>;
    try {
      actionConfig = JSON.parse(newConfig);
    } catch {
      setError("Action config must be valid JSON.");
      return;
    }
    setError(null);
    await apiPost(`/automation/rules/${ruleId}/steps`, { actionType: newActionType, actionConfig, isEntryPoint: rule?.steps.length === 0 });
    setNewConfig("{}");
    await load();
  }

  async function handleSetNextStep(stepId: string, field: "nextStepId" | "conditionTrueStepId" | "conditionFalseStepId", value: string) {
    if (!ruleId) return;
    await apiPatch(`/automation/rules/${ruleId}/steps/${stepId}`, { [field]: value || undefined });
    await load();
  }

  async function handleDeleteStep(stepId: string) {
    if (!ruleId) return;
    await apiFetch(`/automation/rules/${ruleId}/steps/${stepId}`, { method: "DELETE" });
    await load();
  }

  async function handleToggleActive() {
    if (!ruleId || !rule) return;
    setError(null);
    const res = await apiPost(`/automation/rules/${ruleId}/${rule.isActive ? "disable" : "enable"}`);
    if (!res.ok) {
      setError(res.error?.message ?? "Couldn't change enabled state.");
      return;
    }
    await load();
    onChanged();
  }

  async function handleTestRun() {
    if (!ruleId) return;
    let triggerContext: Record<string, unknown>;
    try {
      triggerContext = JSON.parse(testContext);
    } catch {
      setError("Trigger context must be valid JSON.");
      return;
    }
    setError(null);
    const res = await apiPost<Execution>(`/automation/rules/${ruleId}/test-run`, { triggerContext });
    if (res.ok && res.data) setTestResult(res.data);
    await load();
  }

  if (!rule) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={rule.name} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Badge variant={rule.isActive ? "success" : "outline"}>{rule.isActive ? "Enabled" : "Disabled"}</Badge>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleActive()}>{rule.isActive ? "Disable" : "Enable"}</Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><GitBranch className="h-4 w-4" aria-hidden="true" />Steps (visual flow)</h4>
          <div className="flex flex-col gap-2">
            {rule.steps.map((step) => (
              <div key={step.id} className="rounded-md border border-border p-3 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step.isEntryPoint && <Badge variant="success">Start</Badge>}
                    <span className="font-medium">{ACTION_TYPES.find((a) => a.value === step.actionType)?.label ?? step.actionType}</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleDeleteStep(step.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                </div>
                <pre className="mb-2 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(step.actionConfig ?? {}, null, 0)}</pre>
                {step.actionType === "condition_branch" ? (
                  <div className="flex flex-col gap-1 text-xs">
                    <label className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-success" aria-hidden="true" />If true → <Select value={step.conditionTrueStepId ?? ""} onChange={(e) => void handleSetNextStep(step.id, "conditionTrueStepId", e.target.value)} options={[{ value: "", label: "(end)" }, ...rule.steps.filter((s) => s.id !== step.id).map((s) => ({ value: s.id, label: s.actionType }))]} className="h-7 w-40 text-xs" /></label>
                    <label className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-destructive" aria-hidden="true" />If false → <Select value={step.conditionFalseStepId ?? ""} onChange={(e) => void handleSetNextStep(step.id, "conditionFalseStepId", e.target.value)} options={[{ value: "", label: "(end)" }, ...rule.steps.filter((s) => s.id !== step.id).map((s) => ({ value: s.id, label: s.actionType }))]} className="h-7 w-40 text-xs" /></label>
                  </div>
                ) : (
                  <label className="flex items-center gap-1.5 text-xs"><ArrowRight className="h-3 w-3" aria-hidden="true" />Then → <Select value={step.nextStepId ?? ""} onChange={(e) => void handleSetNextStep(step.id, "nextStepId", e.target.value)} options={[{ value: "", label: "(end)" }, ...rule.steps.filter((s) => s.id !== step.id).map((s) => ({ value: s.id, label: s.actionType }))]} className="h-7 w-40 text-xs" /></label>
                )}
              </div>
            ))}
            {rule.steps.length === 0 && <p className="text-xs text-muted-foreground">No steps yet — add one below.</p>}
          </div>

          <div className="mt-3 flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
            <div className="flex gap-2">
              <Select value={newActionType} onChange={(e) => setNewActionType(e.target.value)} options={ACTION_TYPES} className="w-48" />
              <Button type="button" size="sm" variant="outline" onClick={() => void handleAddStep()}><Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Add step</Button>
            </div>
            <Textarea placeholder='Action config JSON, e.g. {"to": "+919876543210", "body": "Hi!"}' rows={2} value={newConfig} onChange={(e) => setNewConfig(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><FlaskConical className="h-4 w-4" aria-hidden="true" />Test mode</h4>
          <Textarea placeholder='Trigger context JSON, e.g. {"leadId": "...", "phone": "+91..."}' rows={2} value={testContext} onChange={(e) => setTestContext(e.target.value)} className="mb-2 font-mono text-xs" />
          <Button type="button" size="sm" onClick={() => void handleTestRun()}><Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Run test</Button>
          {testResult && (
            <div className="mt-2 rounded-md bg-muted p-2 text-xs">
              <p>Status: <Badge variant={testResult.status === "completed" ? "success" : "destructive"}>{testResult.status}</Badge></p>
              {testResult.errorMessage && <p className="text-destructive">{testResult.errorMessage}</p>}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Execution history</h4>
          <ul className="max-h-40 overflow-y-auto rounded-md border border-border text-xs">
            {executions.map((e) => (
              <li key={e.id} className="flex items-center justify-between border-b border-border p-2 last:border-0">
                <span>{new Date(e.startedAt).toLocaleString("en-IN")} {e.isTestRun && <Badge variant="outline">test</Badge>}</span>
                <Badge variant={e.status === "completed" ? "success" : e.status === "failed" ? "destructive" : "outline"}>{e.status}</Badge>
              </li>
            ))}
            {executions.length === 0 && <li className="p-2 text-muted-foreground">No runs yet.</li>}
          </ul>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
