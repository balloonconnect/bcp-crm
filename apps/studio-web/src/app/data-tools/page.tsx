"use client";

import * as React from "react";
import { Upload, Download, Database, RotateCcw, ArrowRight } from "lucide-react";
import { Button, Select, Badge } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../lib/api-client";

const IMPORT_TYPES = [
  { value: "leads", label: "Leads" }, { value: "clients", label: "Clients" }, { value: "packages", label: "Packages" }, { value: "services", label: "Services" },
  { value: "payments", label: "Payments" }, { value: "vendors", label: "Vendors" }, { value: "equipment", label: "Equipment" }, { value: "gallery_metadata", label: "Gallery metadata" },
];
const EXPORT_TYPES = [
  { value: "leads", label: "Leads" }, { value: "clients", label: "Clients" }, { value: "bookings", label: "Bookings" }, { value: "events", label: "Events" }, { value: "payments", label: "Payments" },
  { value: "expenses", label: "Expenses" }, { value: "galleries", label: "Galleries" }, { value: "albums", label: "Albums" }, { value: "audit_logs", label: "Audit logs" }, { value: "complete_studio_data", label: "Complete studio data" },
];

interface ImportJob { id: string; entityType: string; status: string; totalRows: number; successCount: number; errorCount: number; duplicateCount: number; errors: { id: string; rowNumber: number; errorMessage: string }[] }
interface MappingInfo { headers: string[]; fields: { key: string; label: string; required: boolean }[]; suggestedMapping: Record<string, string> }
interface PreviewInfo { totalRows: number; preview: { rowNumber: number; valid: boolean; errors: string[] }[] }
interface ExportJobRecord { id: string; exportType: string; status: string }
interface BackupRecord { id: string; status: string; requestedAt: string }
interface RestoreRecord { id: string; status: string; requestedAt: string }

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DataToolsPage() {
  const [importType, setImportType] = React.useState("leads");
  const [importJob, setImportJob] = React.useState<ImportJob | null>(null);
  const [mapping, setMapping] = React.useState<MappingInfo | null>(null);
  const [chosenMapping, setChosenMapping] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<PreviewInfo | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [exportType, setExportType] = React.useState("leads");
  const [exportJobs, setExportJobs] = React.useState<ExportJobRecord[]>([]);
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [restores, setRestores] = React.useState<RestoreRecord[]>([]);

  const loadExports = React.useCallback(async () => {
    const res = await apiGet<ExportJobRecord[]>("/export-jobs");
    if (res.ok && res.data) setExportJobs(res.data);
  }, []);
  const loadBackups = React.useCallback(async () => {
    const [backupsRes, restoresRes] = await Promise.all([apiGet<BackupRecord[]>("/backups"), apiGet<RestoreRecord[]>("/restores")]);
    if (backupsRes.ok && backupsRes.data) setBackups(backupsRes.data);
    if (restoresRes.ok && restoresRes.data) setRestores(restoresRes.data);
  }, []);

  React.useEffect(() => {
    void loadExports();
    void loadBackups();
  }, [loadExports, loadBackups]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch(`${apiBase}/import-jobs/upload`, { method: "POST", body: formData, credentials: "include" });
    const uploadJson = (await uploadRes.json()) as { ok: boolean; data?: { fileKey: string } };
    if (!uploadJson.ok || !uploadJson.data) return;

    const jobRes = await apiPost<ImportJob>("/import-jobs", { entityType: importType, fileKey: uploadJson.data.fileKey });
    if (jobRes.ok && jobRes.data) {
      setImportJob(jobRes.data);
      const mappingRes = await apiGet<MappingInfo>(`/import-jobs/${jobRes.data.id}/suggested-mapping`);
      if (mappingRes.ok && mappingRes.data) {
        setMapping(mappingRes.data);
        setChosenMapping(mappingRes.data.suggestedMapping);
      }
    }
  }

  async function handleConfirmMapping() {
    if (!importJob) return;
    await apiPatch(`/import-jobs/${importJob.id}/mapping`, { columnMapping: chosenMapping, duplicateHandling: "skip" });
    const previewRes = await apiGet<PreviewInfo>(`/import-jobs/${importJob.id}/preview`);
    if (previewRes.ok && previewRes.data) setPreview(previewRes.data);
  }

  async function handleProcess() {
    if (!importJob) return;
    const res = await apiPost<ImportJob>(`/import-jobs/${importJob.id}/process`, { confirm: true });
    if (res.ok && res.data) setImportJob(res.data);
  }

  async function handleRetry() {
    if (!importJob) return;
    const res = await apiPost<ImportJob>(`/import-jobs/${importJob.id}/retry`);
    if (res.ok && res.data) setImportJob(res.data);
  }

  async function handleExport() {
    await apiPost("/export-jobs", { exportType });
    await loadExports();
  }

  async function handleRequestBackup() {
    await apiPost("/backups/request");
    await loadBackups();
  }

  async function handleRequestRestore(backupId: string) {
    await apiPost("/restores/request", { backupId });
    await loadBackups();
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 font-display text-2xl">Data Tools</h1>

      {/* ── Import ─────────────────────────────────────────────── */}
      <section className="mb-8 rounded-md border border-border p-4">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-lg"><Upload className="h-4 w-4" aria-hidden="true" />Import</h2>
        <div className="mb-3 flex items-center gap-2">
          <Select value={importType} onChange={(e) => setImportType(e.target.value)} options={IMPORT_TYPES} className="w-48" />
          <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Choose CSV file</Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
        </div>

        {mapping && !preview && (
          <div className="mb-3 flex flex-col gap-2">
            <p className="text-sm font-medium">Column mapping</p>
            {mapping.headers.map((header) => (
              <div key={header} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate text-muted-foreground">{header}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <Select
                  value={chosenMapping[header] ?? ""}
                  onChange={(e) => setChosenMapping((m) => ({ ...m, [header]: e.target.value }))}
                  options={[{ value: "", label: "(skip)" }, ...mapping.fields.map((f) => ({ value: f.key, label: `${f.label}${f.required ? " *" : ""}` }))]}
                  className="w-48"
                />
              </div>
            ))}
            <Button type="button" size="sm" onClick={() => void handleConfirmMapping()}>Preview</Button>
          </div>
        )}

        {preview && !importJob?.successCount && (
          <div className="mb-3">
            <p className="mb-2 text-sm">{preview.totalRows} rows found. Preview of first {preview.preview.length}:</p>
            <ul className="mb-3 max-h-40 overflow-y-auto rounded-md bg-muted p-2 text-xs">
              {preview.preview.map((row) => (
                <li key={row.rowNumber} className={row.valid ? "" : "text-destructive"}>
                  Row {row.rowNumber}: {row.valid ? "OK" : row.errors.join(", ")}
                </li>
              ))}
            </ul>
            <Button type="button" size="sm" onClick={() => void handleProcess()}>Process import</Button>
          </div>
        )}

        {importJob && importJob.status !== "uploaded" && importJob.status !== "mapping" && importJob.status !== "previewing" && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p>
              <Badge variant={importJob.status === "completed" ? "success" : importJob.status === "failed" ? "destructive" : "warning"} className="capitalize">{importJob.status.replace(/_/g, " ")}</Badge>
              {" "}{importJob.successCount} succeeded, {importJob.errorCount} failed, {importJob.duplicateCount} duplicates skipped
            </p>
            {importJob.errors.length > 0 && (
              <>
                <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-destructive">
                  {importJob.errors.map((e) => <li key={e.id}>Row {e.rowNumber}: {e.errorMessage}</li>)}
                </ul>
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void handleRetry()}><RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Retry failed rows</Button>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Export ─────────────────────────────────────────────── */}
      <section className="mb-8 rounded-md border border-border p-4">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-lg"><Download className="h-4 w-4" aria-hidden="true" />Export</h2>
        <div className="mb-3 flex items-center gap-2">
          <Select value={exportType} onChange={(e) => setExportType(e.target.value)} options={EXPORT_TYPES} className="w-56" />
          <Button type="button" size="sm" onClick={() => void handleExport()}>Generate export</Button>
        </div>
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
          {exportJobs.map((j) => (
            <li key={j.id} className="flex items-center justify-between p-2">
              <Badge variant="outline" className="capitalize">{j.exportType.replace(/_/g, " ")}</Badge>
              {j.status === "completed" ? (
                <a href={`${apiBase}/export-jobs/${j.id}/download`} target="_blank" rel="noreferrer" className="text-xs text-brand underline">Download</a>
              ) : (
                <Badge variant={j.status === "failed" ? "destructive" : "warning"}>{j.status}</Badge>
              )}
            </li>
          ))}
          {exportJobs.length === 0 && <li className="p-2 text-xs text-muted-foreground">No exports yet.</li>}
        </ul>
      </section>

      {/* ── Backup & Restore ───────────────────────────────────── */}
      <section className="rounded-md border border-border p-4">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-lg"><Database className="h-4 w-4" aria-hidden="true" />Backup &amp; Restore</h2>
        <p className="mb-3 text-xs text-muted-foreground">Backups are encrypted and require Platform Admin approval before they run.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleRequestBackup()}>Request a backup</Button>

        <ul className="mt-3 flex flex-col divide-y divide-border rounded-md border border-border text-sm">
          {backups.map((b) => (
            <li key={b.id} className="flex items-center justify-between p-2">
              <span className="text-xs text-muted-foreground">{new Date(b.requestedAt).toLocaleString("en-IN")}</span>
              <div className="flex items-center gap-2">
                <Badge variant={b.status === "completed" ? "success" : b.status === "rejected" || b.status === "failed" ? "destructive" : "warning"} className="capitalize">{b.status.replace(/_/g, " ")}</Badge>
                {b.status === "completed" && <Button type="button" size="sm" variant="outline" onClick={() => void handleRequestRestore(b.id)}>Request restore</Button>}
              </div>
            </li>
          ))}
          {backups.length === 0 && <li className="p-2 text-xs text-muted-foreground">No backups requested yet.</li>}
        </ul>

        {restores.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-border rounded-md border border-border text-sm">
            {restores.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-2">
                <span className="text-xs text-muted-foreground">Restore requested {new Date(r.requestedAt).toLocaleString("en-IN")}</span>
                <Badge variant={r.status === "completed" ? "success" : r.status === "rejected" || r.status === "failed" ? "destructive" : "warning"} className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
