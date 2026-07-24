"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@bcp/ui";

interface ServiceStatus { service: string; status: "healthy" | "degraded" | "unhealthy" }
interface UptimeEntry { service: string; uptimePercent: number }
interface IncidentUpdate { id: string; status: string; message: string; createdAt: string }
interface IncidentRecord { id: string; title: string; severity: string; status: string; startedAt: string; resolvedAt: string | null; updates: IncidentUpdate[] }
interface PublicStatus { status: "healthy" | "degraded" | "unhealthy"; services: ServiceStatus[]; uptime90d: UptimeEntry[]; incidents: IncidentRecord[] }

const SERVICE_LABELS: Record<string, string> = {
  api: "API", database: "Database", redis: "Redis", storage: "Storage",
  ai_provider: "AI features", whatsapp: "WhatsApp", payment_provider: "Payments", queue: "Background jobs",
};

const STATUS_COLOR: Record<string, string> = { healthy: "#16a34a", degraded: "#d97706", unhealthy: "#dc2626" };
const STATUS_LABEL: Record<string, string> = { healthy: "Operational", degraded: "Degraded performance", unhealthy: "Outage" };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function Dot({ status }: { status: string }) {
  return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: STATUS_COLOR[status] ?? "#94a3b8" }} aria-hidden="true" />;
}

export default function Page() {
  const [data, setData] = React.useState<PublicStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/status/public`);
        const json = await res.json();
        if (!cancelled && json.ok) setData(json.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const interval = setInterval(() => void load(), 60_000); // a public status page should stay current without a manual refresh
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const uptimeByService = new Map((data?.uptime90d ?? []).map((u) => [u.service, u.uptimePercent]));
  const openIncidents = (data?.incidents ?? []).filter((i) => i.status !== "resolved");
  const pastIncidents = (data?.incidents ?? []).filter((i) => i.status === "resolved");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data && <Dot status={data.status} />}
            {loading ? "Checking status…" : data ? STATUS_LABEL[data.status] : "Status unavailable"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Real-time status for every service BCP Studio OS depends on, and a history of past incidents.
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Services</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {(data?.services ?? []).map((s) => (
              <li key={s.service} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2"><Dot status={s.status} />{SERVICE_LABELS[s.service] ?? s.service}</span>
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABEL[s.status]}
                  {uptimeByService.has(s.service) && ` · ${uptimeByService.get(s.service)}% uptime (90d)`}
                </span>
              </li>
            ))}
            {!loading && (data?.services.length ?? 0) === 0 && <li className="py-2 text-sm text-muted-foreground">No health data yet.</li>}
          </ul>
        </CardContent>
      </Card>

      {openIncidents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ongoing incidents</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {openIncidents.map((incident) => (
              <div key={incident.id} className="text-sm">
                <p className="font-medium">{incident.title} <span className="text-xs uppercase text-muted-foreground">({incident.severity})</span></p>
                <ul className="mt-1 flex flex-col gap-1 border-l-2 border-border pl-3">
                  {incident.updates.map((u) => (
                    <li key={u.id} className="text-xs">
                      <span className="font-medium capitalize">{u.status}</span> — {u.message}
                      <span className="ml-1 text-muted-foreground">({new Date(u.createdAt).toLocaleString("en-IN")})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Incident history</CardTitle></CardHeader>
        <CardContent>
          {pastIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past incidents.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {pastIncidents.map((incident) => (
                <li key={incident.id} className="py-2">
                  <p className="font-medium">{incident.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(incident.startedAt).toLocaleDateString("en-IN")}
                    {incident.resolvedAt && ` – ${new Date(incident.resolvedAt).toLocaleDateString("en-IN")}`} · resolved
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
