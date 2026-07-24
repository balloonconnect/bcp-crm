"use client";

import * as React from "react";
import { BarChart3, Download, FileText, Save, Clock, Trash2 } from "lucide-react";
import { Button, Input, Select, Badge } from "@bcp/ui";
import { apiGet, apiPost, apiFetch } from "../../lib/api-client";
import { SimpleBarChart, tryExtractChartData } from "../../components/reports/simple-bar-chart";

const REPORT_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  Sales: [{ value: "leads", label: "Leads" }, { value: "sources", label: "Sources" }, { value: "conversion", label: "Conversion" }, { value: "quotations", label: "Quotations" }, { value: "bookings", label: "Bookings" }],
  Finance: [{ value: "revenue", label: "Revenue" }, { value: "payments", label: "Payments" }, { value: "outstanding_amounts", label: "Outstanding amounts" }, { value: "expenses", label: "Expenses" }, { value: "profit", label: "Profit" }],
  Catalog: [{ value: "packages", label: "Packages" }, { value: "event_types", label: "Event types" }],
  Operations: [{ value: "branches", label: "Branches" }, { value: "team_performance", label: "Team performance" }, { value: "freelancer_cost", label: "Freelancer cost" }],
  Production: [{ value: "album_production", label: "Album production" }, { value: "gallery_activity", label: "Gallery activity" }],
  Clients: [{ value: "client_satisfaction", label: "Client satisfaction" }, { value: "referrals", label: "Referrals" }],
  Platform: [{ value: "storage", label: "Storage" }, { value: "ai_usage", label: "AI usage" }, { value: "whatsapp_usage", label: "WhatsApp usage" }],
};

interface ReportResult { columns: { key: string; header: string }[]; rows: Record<string, unknown>[] }
interface SavedReportRecord { id: string; name: string; reportType: string }
interface ScheduleRecord { id: string; frequency: string; recipientEmails: string[]; isActive: boolean; savedReport: { name: string } }

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ReportsPage() {
  const [reportType, setReportType] = React.useState("leads");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [result, setResult] = React.useState<ReportResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [savedReports, setSavedReports] = React.useState<SavedReportRecord[]>([]);
  const [schedules, setSchedules] = React.useState<ScheduleRecord[]>([]);
  const [scheduleEmails, setScheduleEmails] = React.useState("");
  const [scheduleFrequency, setScheduleFrequency] = React.useState("weekly");
  const [scheduleForSavedId, setScheduleForSavedId] = React.useState<string | null>(null);

  const loadSaved = React.useCallback(async () => {
    const [savedRes, schedulesRes] = await Promise.all([apiGet<SavedReportRecord[]>("/reports/saved"), apiGet<ScheduleRecord[]>("/reports/schedules")]);
    if (savedRes.ok && savedRes.data) setSavedReports(savedRes.data);
    if (schedulesRes.ok && schedulesRes.data) setSchedules(schedulesRes.data);
  }, []);

  React.useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  function currentFilters() {
    return { fromDate: fromDate ? new Date(fromDate).toISOString() : undefined, toDate: toDate ? new Date(toDate).toISOString() : undefined, branchId: branchId || undefined, userId: userId || undefined };
  }

  async function handleRun() {
    setLoading(true);
    const res = await apiPost<ReportResult>("/reports/run", { reportType, filters: currentFilters() });
    setLoading(false);
    if (res.ok && res.data) setResult(res.data);
  }

  async function handleSave() {
    if (!saveName.trim()) return;
    await apiPost("/reports/saved", { reportType, name: saveName, filters: currentFilters() });
    setSaveName("");
    await loadSaved();
  }

  async function handleDeleteSaved(id: string) {
    await apiFetch(`/reports/saved/${id}`, { method: "DELETE" });
    await loadSaved();
  }

  async function handleCreateSchedule() {
    if (!scheduleForSavedId || !scheduleEmails.trim()) return;
    await apiPost("/reports/schedules", { savedReportId: scheduleForSavedId, frequency: scheduleFrequency, recipientEmails: scheduleEmails.split(",").map((e) => e.trim()).filter(Boolean) });
    setScheduleEmails(""); setScheduleForSavedId(null);
    await loadSaved();
  }

  async function handleToggleSchedule(id: string, isActive: boolean) {
    await apiPost(`/reports/schedules/${id}/${isActive ? "disable" : "enable"}`);
    await loadSaved();
  }

  async function handleDeleteSchedule(id: string) {
    await apiFetch(`/reports/schedules/${id}`, { method: "DELETE" });
    await loadSaved();
  }

  const chartData = result ? tryExtractChartData(result.columns, result.rows) : null;

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8" data-tour="reports-picker">
      <h1 className="mb-6 flex items-center gap-2 font-display text-2xl"><BarChart3 className="h-5 w-5" aria-hidden="true" />Reports &amp; Analytics</h1>

      <div className="mb-6 flex flex-col gap-3 rounded-md border border-border p-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(REPORT_CATEGORIES).map(([category, reports]) => (
            <div key={category}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{category}</p>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)} options={reports} className="w-44" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">From<Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">To<Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
          <Input placeholder="Branch ID" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-40" />
          <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-40" />
          <Button type="button" size="sm" disabled={loading} onClick={() => void handleRun()}>{loading ? "Running…" : "Run report"}</Button>
        </div>
      </div>

      {result && (
        <div className="mb-8 rounded-md border border-border p-4">
          {chartData ? <SimpleBarChart data={chartData} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr>{result.columns.map((c) => <th key={c.key} className="border-b border-border p-1.5 font-medium">{c.header}</th>)}</tr></thead>
                <tbody>
                  {result.rows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">{result.columns.map((c) => <td key={c.key} className="p-1.5">{String(row[c.key] ?? "")}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input placeholder="Save as…" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="w-48" />
            <Button type="button" size="sm" variant="outline" onClick={() => void handleSave()}><Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Save report</Button>
          </div>
        </div>
      )}

      <h2 className="mb-2 font-display text-lg">Saved reports</h2>
      <ul className="mb-8 flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {savedReports.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-2">
            <div>
              <p className="font-medium">{s.name}</p>
              <Badge variant="outline" className="capitalize">{s.reportType.replace(/_/g, " ")}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon" className="h-7 w-7"><a href={`${apiBase}/reports/saved/${s.id}/export/csv`} target="_blank" rel="noreferrer" title="Export CSV"><Download className="h-3.5 w-3.5" aria-hidden="true" /></a></Button>
              <Button asChild variant="ghost" size="icon" className="h-7 w-7"><a href={`${apiBase}/reports/saved/${s.id}/export/pdf`} target="_blank" rel="noreferrer" title="Export PDF"><FileText className="h-3.5 w-3.5" aria-hidden="true" /></a></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScheduleForSavedId(s.id)} title="Schedule"><Clock className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleDeleteSaved(s.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </div>
          </li>
        ))}
        {savedReports.length === 0 && <li className="p-2 text-xs text-muted-foreground">No saved reports yet.</li>}
      </ul>

      {scheduleForSavedId && (
        <div className="mb-8 flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <p className="text-sm font-medium">Schedule this report</p>
          <div className="flex gap-2">
            <Select value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value)} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} className="w-32" />
            <Input placeholder="Recipient emails, comma-separated" value={scheduleEmails} onChange={(e) => setScheduleEmails(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void handleCreateSchedule()}>Schedule</Button>
          </div>
        </div>
      )}

      <h2 className="mb-2 font-display text-lg">Scheduled reports</h2>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
        {schedules.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-2">
            <div>
              <p className="font-medium">{s.savedReport.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{s.frequency} → {s.recipientEmails.join(", ")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={s.isActive ? "success" : "outline"}>{s.isActive ? "Active" : "Paused"}</Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleSchedule(s.id, s.isActive)}>{s.isActive ? "Pause" : "Resume"}</Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleDeleteSchedule(s.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </div>
          </li>
        ))}
        {schedules.length === 0 && <li className="p-2 text-xs text-muted-foreground">No scheduled reports yet.</li>}
      </ul>
    </main>
  );
}
