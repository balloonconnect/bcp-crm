"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, ResponsiveContentContainer, ResponsivePageHeader, LoadingState, Badge, Button, Input, Select } from "@bcp/ui";
import { useApiGet } from "../../lib/use-api";
import { apiPost, apiDelete } from "../../lib/api-client";

interface ServiceResult { service: string; status: "healthy" | "degraded" | "unhealthy"; latencyMs: number | null; errorMessage: string | null }
interface HealthData { status: "healthy" | "degraded" | "unhealthy"; services: ServiceResult[] }
interface AlertRule { id: string; name: string; service: string; triggerStatus: string; consecutiveFailuresRequired: number; isActive: boolean }
interface Incident { id: string; title: string; severity: string; status: string; startedAt: string }

const healthVariant = { healthy: "success", degraded: "warning", unhealthy: "destructive" } as const;
const SERVICE_LABELS: Record<string, string> = { api: "API", database: "Database", redis: "Redis", storage: "Storage", ai_provider: "AI provider", whatsapp: "WhatsApp", payment_provider: "Payment provider", queue: "Queue" };

export default function HealthPage() {
  const { data, loading, refetch } = useApiGet<HealthData>("/platform/monitoring/health");
  const { data: rules, refetch: refetchRules } = useApiGet<AlertRule[]>("/platform/monitoring/alert-rules");
  const { data: incidentList } = useApiGet<Incident[]>("/platform/monitoring/incidents");

  const [ruleName, setRuleName] = React.useState("");
  const [ruleService, setRuleService] = React.useState("database");
  const [ruleTrigger, setRuleTrigger] = React.useState("unhealthy");

  async function handleCreateRule() {
    if (!ruleName.trim()) return;
    await apiPost("/platform/monitoring/alert-rules", { name: ruleName, service: ruleService, triggerStatus: ruleTrigger });
    setRuleName("");
    await refetchRules();
  }

  async function handleDeleteRule(id: string) {
    await apiDelete(`/platform/monitoring/alert-rules/${id}`);
    await refetchRules();
  }

  return (
    <ResponsiveContentContainer>
      <ResponsivePageHeader title="Health Monitoring" description="Per-service platform health, alert rules, and incident history." />
      {loading && <LoadingState label="Checking system health…" />}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.services.map((s) => (
              <Card key={s.service}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{SERVICE_LABELS[s.service] ?? s.service}</CardTitle>
                  <Badge variant={healthVariant[s.status]}>{s.status}</Badge>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {s.latencyMs !== null && <p>{s.latencyMs}ms</p>}
                  {s.errorMessage && <p className="text-destructive">{s.errorMessage}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="mb-8" onClick={() => void refetch()}>Refresh checks</Button>
        </>
      )}

      <h2 className="mb-2 font-display text-lg">Alert rules</h2>
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <Input placeholder="Rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} className="w-48" />
        <Select value={ruleService} onChange={(e) => setRuleService(e.target.value)} options={Object.entries(SERVICE_LABELS).map(([value, label]) => ({ value, label }))} className="w-44" />
        <Select value={ruleTrigger} onChange={(e) => setRuleTrigger(e.target.value)} options={[{ value: "degraded", label: "Degraded" }, { value: "unhealthy", label: "Unhealthy" }]} className="w-36" />
        <Button type="button" size="sm" onClick={() => void handleCreateRule()}>Add rule</Button>
      </div>
      <ul className="mb-8 flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {(rules ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between p-2">
            <span>{r.name} — {SERVICE_LABELS[r.service] ?? r.service} reaches {r.triggerStatus} for {r.consecutiveFailuresRequired} consecutive checks</span>
            <div className="flex items-center gap-2">
              <Badge variant={r.isActive ? "success" : "outline"}>{r.isActive ? "Active" : "Paused"}</Badge>
              <Button type="button" size="sm" variant="ghost" onClick={() => void handleDeleteRule(r.id)}>Delete</Button>
            </div>
          </li>
        ))}
        {(rules ?? []).length === 0 && <li className="p-2 text-xs text-muted-foreground">No alert rules configured.</li>}
      </ul>

      <h2 className="mb-2 font-display text-lg">Incidents</h2>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {(incidentList ?? []).map((i) => (
          <li key={i.id} className="flex items-center justify-between p-2">
            <span>{i.title} <span className="text-xs uppercase text-muted-foreground">({i.severity})</span></span>
            <Badge variant={i.status === "resolved" ? "success" : "warning"} className="capitalize">{i.status}</Badge>
          </li>
        ))}
        {(incidentList ?? []).length === 0 && <li className="p-2 text-xs text-muted-foreground">No incidents recorded.</li>}
      </ul>
    </ResponsiveContentContainer>
  );
}
