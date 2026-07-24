"use client";

import * as React from "react";
import { BookImage, Star } from "lucide-react";
import { Badge, Button, Input, Select } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";

const PRESET_OPTIONS = [
  { value: "wedding", label: "Wedding" }, { value: "engagement", label: "Engagement" }, { value: "baby", label: "Baby" },
  { value: "maternity", label: "Maternity" }, { value: "birthday", label: "Birthday" }, { value: "corporate", label: "Corporate" }, { value: "school", label: "School" },
];

interface AlbumPhoto {
  id: string;
  sequenceOrder: number;
  isCoverRecommendation: boolean;
  momentCategory: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  galleryPhoto: { id: string; thumbnailKey: string | null };
}
interface AlbumSuggestionDetail { id: string; presetType: string; targetPhotoCount: number; photos: AlbumPhoto[] }

export function AlbumSuggestionPanel({ galleryId }: { galleryId: string }) {
  const [preset, setPreset] = React.useState("wedding");
  const [targetCount, setTargetCount] = React.useState(40);
  const [suggestion, setSuggestion] = React.useState<AlbumSuggestionDetail | null>(null);
  const [generating, setGenerating] = React.useState(false);

  const loadLatest = React.useCallback(async () => {
    const res = await apiGet<{ id: string }[]>(`/galleries/${galleryId}/album-suggestions`);
    if (res.ok && res.data && res.data.length > 0) {
      const detail = await apiGet<AlbumSuggestionDetail>(`/album-suggestions/${res.data[0]!.id}`);
      if (detail.ok && detail.data) setSuggestion(detail.data);
    }
  }, [galleryId]);

  React.useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await apiPost<AlbumSuggestionDetail>(`/galleries/${galleryId}/album-suggestions`, { presetType: preset, targetPhotoCount: targetCount });
    if (res.ok && res.data) setSuggestion(res.data);
    setGenerating(false);
  }

  async function handleSetCover(galleryPhotoId: string) {
    if (!suggestion) return;
    await apiPost(`/album-suggestions/${suggestion.id}/cover`, { galleryPhotoId });
    await loadLatest();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold"><BookImage className="h-4 w-4" aria-hidden="true" />Album suggestions</h3>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Preset
          <Select value={preset} onChange={(e) => setPreset(e.target.value)} options={PRESET_OPTIONS} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Target photo count
          <Input type="number" min={1} value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))} className="w-24" />
        </label>
        <Button type="button" size="sm" disabled={generating} onClick={() => void handleGenerate()}>{generating ? "Generating…" : "Generate album"}</Button>
      </div>

      {suggestion && (
        <ol className="flex flex-col divide-y divide-border rounded-md border border-border">
          {suggestion.photos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 text-xs text-muted-foreground">#{p.sequenceOrder + 1}</span>
                {p.momentCategory && <Badge variant="outline">{p.momentCategory}</Badge>}
                {p.isCoverRecommendation && <Badge variant="success"><Star className="mr-1 h-3 w-3" aria-hidden="true" />Cover</Badge>}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleSetCover(p.galleryPhoto.id)} disabled={p.isCoverRecommendation}>
                Make cover
              </Button>
            </li>
          ))}
          {suggestion.photos.length === 0 && <p className="p-4 text-sm text-muted-foreground">No photos selected yet — run culling and analysis first.</p>}
        </ol>
      )}
    </div>
  );
}
