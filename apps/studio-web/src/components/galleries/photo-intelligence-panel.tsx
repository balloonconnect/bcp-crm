"use client";

import * as React from "react";
import { Sparkles, RotateCcw, Check, X, Layers } from "lucide-react";
import { Badge, Button, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

interface Analysis {
  id: string;
  galleryPhoto: { id: string; thumbnailKey: string | null };
  qualityScore: number;
  isBlurry: boolean;
  closedEyeDetected: boolean;
  smileDetected: boolean;
  faceCount: number;
  isGroupPhoto: boolean;
  exposureAssessment: string;
  sceneClassification: string | null;
  momentTags: string[];
  confidence: number;
  explanation: string;
  status: "pending" | "approved" | "rejected";
}

interface DuplicateMember { id: string; similarityScore: number; isBestShot: boolean; galleryPhoto: { id: string; thumbnailKey: string | null } }
interface DuplicateGroup { id: string; groupType: string; confidence: number; explanation: string; status: string; members: DuplicateMember[] }

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function PhotoIntelligencePanel({ galleryId }: { galleryId: string }) {
  const [analyses, setAnalyses] = React.useState<Analysis[]>([]);
  const [duplicateGroups, setDuplicateGroups] = React.useState<DuplicateGroup[]>([]);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [lastBatchId, setLastBatchId] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);

  const load = React.useCallback(async () => {
    const [analysesRes, groupsRes] = await Promise.all([
      apiGet<Analysis[]>(`/galleries/${galleryId}/photo-analyses${statusFilter ? `?status=${statusFilter}` : ""}`),
      apiGet<DuplicateGroup[]>(`/galleries/${galleryId}/duplicate-groups`),
    ]);
    if (analysesRes.ok && analysesRes.data) setAnalyses(analysesRes.data);
    if (groupsRes.ok && groupsRes.data) setDuplicateGroups(groupsRes.data);
  }, [galleryId, statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAnalyzeAll() {
    setAnalyzing(true);
    // Analyzed one photo at a time via the existing per-photo endpoint — there's no separate "analyze all" endpoint, so this just calls it for every photo in the gallery.
    const galleryRes = await apiGet<{ photos: { id: string }[] }>(`/galleries/${galleryId}`);
    const photoIds = galleryRes.ok && galleryRes.data ? galleryRes.data.photos.map((p) => p.id) : [];
    for (const photoId of photoIds) await apiPost(`/galleries/${galleryId}/photos/${photoId}/analyze`);
    await load();
    setAnalyzing(false);
  }

  async function handleDetectDuplicates() {
    await apiPost(`/galleries/${galleryId}/duplicate-groups/detect`);
    await load();
  }

  async function handleReview(analysisId: string, action: "approve" | "reject") {
    await apiPost(`/photo-analyses/${analysisId}/review`, { action });
    await load();
  }

  async function handleUndo(analysisId: string) {
    await apiPost(`/photo-analyses/${analysisId}/undo`);
    await load();
  }

  async function handleBulkReview(action: "approve" | "reject") {
    if (selected.size === 0) return;
    const res = await apiPost<{ batchId: string }>("/photo-analyses/bulk-review", { photoAnalysisIds: [...selected], action });
    if (res.ok && res.data) setLastBatchId(res.data.batchId);
    setSelected(new Set());
    await load();
  }

  async function handleUndoBatch() {
    if (!lastBatchId) return;
    await apiPost(`/photo-analyses/bulk-undo/${lastBatchId}`);
    setLastBatchId(null);
    await load();
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGroupReview(groupId: string, action: "approve" | "reject") {
    await apiPost(`/duplicate-groups/${groupId}/review`, { action });
    await load();
  }

  async function handleSetBestShot(groupId: string, galleryPhotoId: string) {
    await apiPost(`/duplicate-groups/${groupId}/best-shot`, { galleryPhotoId });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4" aria-hidden="true" />AI photo analysis</h3>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={analyzing} onClick={() => void handleAnalyzeAll()}>{analyzing ? "Analyzing…" : "Analyze new photos"}</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleDetectDuplicates()}><Layers className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Find duplicates</Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={FILTER_OPTIONS} className="w-44" />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleBulkReview("approve")}><Check className="mr-1 h-3 w-3" aria-hidden="true" />Approve all</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleBulkReview("reject")}><X className="mr-1 h-3 w-3" aria-hidden="true" />Reject all</Button>
          </div>
        )}
        {lastBatchId && (
          <Button type="button" size="sm" variant="ghost" onClick={() => void handleUndoBatch()}><RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Undo last bulk action</Button>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {analyses.map((a) => (
          <li key={a.id} className="flex items-start gap-3 p-3 text-sm">
            <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelected(a.id)} className="mt-1" />
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">Quality {Math.round(a.qualityScore)}</Badge>
                {a.isBlurry && <Badge variant="warning">Blurry</Badge>}
                {a.closedEyeDetected && <Badge variant="warning">Eyes closed</Badge>}
                {a.smileDetected && <Badge variant="outline">Smiling</Badge>}
                {a.isGroupPhoto && <Badge variant="outline">Group ({a.faceCount})</Badge>}
                <Badge variant="outline" className="capitalize">{a.exposureAssessment}</Badge>
                {a.sceneClassification && <Badge variant="outline">{a.sceneClassification}</Badge>}
                <Badge variant={a.status === "approved" ? "success" : a.status === "rejected" ? "destructive" : "outline"} className="capitalize">{a.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{a.explanation} (confidence {Math.round(a.confidence)}%)</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleReview(a.id, "approve")}><Check className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleReview(a.id, "reject")}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleUndo(a.id)}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </div>
          </li>
        ))}
        {analyses.length === 0 && <p className="p-4 text-sm text-muted-foreground">No analyses yet — click &quot;Analyze new photos&quot; to run the pipeline.</p>}
      </ul>

      {duplicateGroups.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Duplicate &amp; near-duplicate groups</h4>
          <ul className="flex flex-col gap-3">
            {duplicateGroups.map((g) => (
              <li key={g.id} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{g.groupType.replace(/_/g, " ")}</Badge>
                  <Badge variant={g.status === "approved" ? "success" : g.status === "rejected" ? "destructive" : "outline"} className="capitalize">{g.status}</Badge>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{g.explanation}</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {g.members.map((m) => (
                    <button key={m.id} type="button" onClick={() => void handleSetBestShot(g.id, m.galleryPhoto.id)} className={`rounded-md border px-2 py-1 text-xs ${m.isBestShot ? "border-brand bg-brand/10 font-medium" : "border-border"}`}>
                      {m.isBestShot ? "★ Best shot" : `${Math.round(m.similarityScore)}% match`}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleGroupReview(g.id, "approve")}>Confirm duplicates</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleGroupReview(g.id, "reject")}>Not duplicates</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
