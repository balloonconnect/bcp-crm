"use client";

import * as React from "react";
import { Wand2, Check, X } from "lucide-react";
import { Badge, Button, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const PRESET_OPTIONS = [
  { value: "wedding", label: "Wedding" }, { value: "engagement", label: "Engagement" }, { value: "baby", label: "Baby" },
  { value: "maternity", label: "Maternity" }, { value: "birthday", label: "Birthday" }, { value: "corporate", label: "Corporate" }, { value: "school", label: "School" },
];

interface Recommendation {
  id: string;
  recommendation: "include" | "exclude" | "review";
  confidence: number;
  reason: string;
  technicalIssues: string[];
  isEmotionalMoment: boolean;
  isRepeatedPose: boolean;
  status: "pending" | "approved" | "rejected";
  galleryPhoto: { id: string; thumbnailKey: string | null };
}
interface CullingSession { id: string; presetType: string; status: string; recommendations: Recommendation[] }

const REC_VARIANT: Record<string, "success" | "destructive" | "warning"> = { include: "success", exclude: "destructive", review: "warning" };

export function CullingPanel({ galleryId }: { galleryId: string }) {
  const [preset, setPreset] = React.useState("wedding");
  const [weights, setWeights] = React.useState({ technicalQuality: 25, emotionalMoments: 25, peopleBalance: 25, poseVariety: 25 });
  const [session, setSession] = React.useState<CullingSession | null>(null);
  const [running, setRunning] = React.useState(false);

  const loadLatest = React.useCallback(async () => {
    const res = await apiGet<CullingSession[]>(`/galleries/${galleryId}/culling-sessions`);
    if (res.ok && res.data && res.data.length > 0) {
      const detail = await apiGet<CullingSession>(`/culling-sessions/${res.data[0]!.id}`);
      if (detail.ok && detail.data) setSession(detail.data);
    }
  }, [galleryId]);

  React.useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  function updateWeight(key: keyof typeof weights, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRunCulling() {
    setRunning(true);
    const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    const priorityWeightOverrides = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / total]));
    const res = await apiPost<CullingSession>(`/galleries/${galleryId}/culling-sessions`, { presetType: preset, priorityWeightOverrides });
    if (res.ok && res.data) setSession(res.data);
    setRunning(false);
  }

  async function handleReview(recommendationId: string, status: "approved" | "rejected") {
    await apiPost(`/culling-recommendations/${recommendationId}/review`, { status });
    await loadLatest();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4" aria-hidden="true" />AI culling</h3>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Preset
          <Select value={preset} onChange={(e) => setPreset(e.target.value)} options={PRESET_OPTIONS} className="w-40" />
        </label>
        {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1")} ({weights[key]}%)
            <input type="range" min={0} max={100} value={weights[key]} onChange={(e) => updateWeight(key, Number(e.target.value))} className="w-32" />
          </label>
        ))}
        <Button type="button" size="sm" disabled={running} onClick={() => void handleRunCulling()}>{running ? "Running…" : "Run culling"}</Button>
      </div>

      {session && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {session.recommendations.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-3 text-sm">
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant={REC_VARIANT[r.recommendation]} className="capitalize">{r.recommendation}</Badge>
                  {r.isEmotionalMoment && <Badge variant="outline">Emotional moment</Badge>}
                  {r.isRepeatedPose && <Badge variant="outline">Repeated pose</Badge>}
                  {r.technicalIssues.map((issue) => <Badge key={issue} variant="warning" className="capitalize">{issue.replace(/_/g, " ")}</Badge>)}
                  <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "destructive" : "outline"} className="capitalize">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.reason} (confidence {Math.round(r.confidence)}%)</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleReview(r.id, "approved")}><Check className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleReview(r.id, "rejected")}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
            </li>
          ))}
          {session.recommendations.length === 0 && <p className="p-4 text-sm text-muted-foreground">No photos to cull yet — analyze photos first.</p>}
        </ul>
      )}
    </div>
  );
}
