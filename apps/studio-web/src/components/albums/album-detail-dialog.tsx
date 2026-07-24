"use client";

import * as React from "react";
import { Copy, RotateCcw, Bell, Download, FileText } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost, apiPatch } from "../../lib/api-client";
import { AlbumProductionPanel } from "./album-production-panel";

interface CategoryLimit { category: string; limitCount: number }
interface AlbumDetail {
  id: string;
  publicToken: string;
  status: string;
  otpRequired: boolean;
  selectionLimit: number | null;
  deadline: string | null;
  lockedAt: string | null;
  submittedAt: string | null;
  categoryLimits: CategoryLimit[];
}
interface Summary { selectedCount: number; favoriteCount: number; rejectedCount: number; commentCount: number }
interface HistoryEntry { id: string; action: string; actorType: string; createdAt: string; galleryPhoto: { id: string } | null }

export function AlbumDetailDialog({ albumId, open, onOpenChange, onChanged }: { albumId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [album, setAlbum] = React.useState<AlbumDetail | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);
  const [selectionLimit, setSelectionLimit] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newCategoryLimit, setNewCategoryLimit] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const clientPortalBase = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? "http://localhost:3003";

  const load = React.useCallback(async () => {
    if (!albumId) return;
    const [albumRes, summaryRes] = await Promise.all([apiGet<AlbumDetail>(`/albums/${albumId}`), apiGet<Summary>(`/albums/${albumId}/selection-summary`)]);
    if (albumRes.ok && albumRes.data) {
      setAlbum(albumRes.data);
      setSelectionLimit(albumRes.data.selectionLimit?.toString() ?? "");
      setDeadline(albumRes.data.deadline ? albumRes.data.deadline.slice(0, 10) : "");
    }
    if (summaryRes.ok && summaryRes.data) setSummary(summaryRes.data);
  }, [albumId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const publicUrl = album ? `${clientPortalBase.replace(/\/$/, "")}/select/${album.publicToken}` : "";

  async function handleCopyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveSettings() {
    if (!albumId || !album) return;
    const categoryLimits = [...album.categoryLimits];
    await apiPatch(`/albums/${albumId}/settings`, {
      selectionLimit: selectionLimit ? Number(selectionLimit) : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      categoryLimits: categoryLimits.length > 0 ? categoryLimits : undefined,
    });
    await load();
    onChanged();
  }

  async function handleAddCategoryLimit() {
    if (!albumId || !album || !newCategory.trim() || !newCategoryLimit) return;
    const categoryLimits = [...album.categoryLimits, { category: newCategory, limitCount: Number(newCategoryLimit) }];
    await apiPatch(`/albums/${albumId}/settings`, { categoryLimits });
    setNewCategory(""); setNewCategoryLimit("");
    await load();
  }

  async function handleReopen() {
    if (!albumId) return;
    await apiPost(`/albums/${albumId}/reopen`);
    await load();
    onChanged();
  }

  async function handleSendReminder() {
    if (!albumId) return;
    await apiPost(`/albums/${albumId}/send-reminder`);
  }

  async function handleShowHistory() {
    if (!albumId) return;
    const res = await apiGet<HistoryEntry[]>(`/albums/${albumId}/selection-history`);
    if (res.ok && res.data) setHistory(res.data);
    setShowHistory(true);
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  if (!album) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Album selection" className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">{album.status.replace(/_/g, " ")}</Badge>
          {album.lockedAt && <Badge variant="success">Locked / Submitted</Badge>}
          {album.lockedAt && (
            <Button type="button" size="sm" variant="outline" onClick={() => void handleReopen()}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Reopen
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => void handleSendReminder()}>
            <Bell className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Send reminder
          </Button>
        </div>

        <div className="flex gap-2">
          <Input readOnly value={publicUrl} className="text-xs" />
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => void handleCopyLink()}><Copy className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
        {copied && <span className="text-xs text-muted-foreground">Copied.</span>}

        {summary && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><p className="font-display text-xl">{summary.selectedCount}</p><p className="text-xs text-muted-foreground">Selected</p></div>
            <div><p className="font-display text-xl">{summary.favoriteCount}</p><p className="text-xs text-muted-foreground">Favorites</p></div>
            <div><p className="font-display text-xl">{summary.rejectedCount}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
            <div><p className="font-display text-xl">{summary.commentCount}</p><p className="text-xs text-muted-foreground">Comments</p></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Selection limit
            <Input type="number" min={1} value={selectionLimit} onChange={(e) => setSelectionLimit(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Deadline
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Category limits</h4>
          <ul className="mb-2 flex flex-wrap gap-2">
            {album.categoryLimits.map((c) => <Badge key={c.category} variant="outline">{c.category}: {c.limitCount}</Badge>)}
          </ul>
          <div className="flex gap-2">
            <Input placeholder="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-40" />
            <Input type="number" placeholder="Limit" min={1} value={newCategoryLimit} onChange={(e) => setNewCategoryLimit(e.target.value)} className="w-24" />
            <Button type="button" size="sm" variant="outline" onClick={() => void handleAddCategoryLimit()}>Add</Button>
          </div>
        </div>

        <Button type="button" size="sm" onClick={() => void handleSaveSettings()}>Save settings</Button>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`${apiBase}/albums/${album.id}/export/csv`} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Export CSV</a>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleShowHistory()}>
            <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Selection history
          </Button>
        </div>

        {showHistory && (
          <ul className="max-h-48 overflow-y-auto rounded-md bg-muted p-2 text-xs">
            {history.map((h) => (
              <li key={h.id} className="py-0.5">{new Date(h.createdAt).toLocaleString("en-IN")} — {h.actorType} {h.action}</li>
            ))}
            {history.length === 0 && <li className="text-muted-foreground">No history yet.</li>}
          </ul>
        )}

        <AlbumProductionPanel albumId={album.id} />
      </div>
    </ResponsiveDialog>
  );
}
