"use client";

import * as React from "react";
import { Copy, QrCode, Trash2, Eye, EyeOff } from "lucide-react";
import { ResponsiveDialog, Badge, Button, Input } from "@bcp/ui";
import { apiGet, apiPost, apiPatch, apiFetch } from "../../lib/api-client";
import { UploadPanel } from "./upload-panel";
import { FaceSearchPanel } from "./face-search-panel";
import { PhotoIntelligencePanel } from "./photo-intelligence-panel";
import { CullingPanel } from "./culling-panel";
import { AlbumSuggestionPanel } from "./album-suggestion-panel";

interface Photo { id: string; fileKey: string; category: string | null; isHidden: boolean; order: number; thumbnailKey: string | null }
interface GalleryDetail {
  id: string;
  publicToken: string;
  title: string | null;
  status: string;
  photoCount: number;
  layout: string;
  photos: Photo[];
  faceSearchEnabled: boolean;
  faceSearchConfidenceThreshold: number;
  faceSearchRetentionDays: number;
}
interface Stats { favoriteCount: number; commentCount: number; downloadCount: number; uniqueGuestCount: number }

export function GalleryDetailDialog({ galleryId, open, onOpenChange, onChanged }: { galleryId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [gallery, setGallery] = React.useState<GalleryDetail | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [copied, setCopied] = React.useState(false);
  const galleryWebBase = process.env.NEXT_PUBLIC_GALLERY_WEB_URL ?? "http://localhost:3004";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const load = React.useCallback(async () => {
    if (!galleryId) return;
    const [galleryRes, statsRes] = await Promise.all([apiGet<GalleryDetail>(`/galleries/${galleryId}`), apiGet<Stats>(`/galleries/${galleryId}/stats`)]);
    if (galleryRes.ok && galleryRes.data) setGallery(galleryRes.data);
    if (statsRes.ok && statsRes.data) setStats(statsRes.data);
  }, [galleryId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const publicUrl = gallery ? `${galleryWebBase.replace(/\/$/, "")}/g/${gallery.publicToken}` : "";

  async function handleCopyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePhotoAdded() {
    await load();
    onChanged();
  }

  async function handleToggleHidden(photoId: string, isHidden: boolean) {
    if (!galleryId) return;
    await apiPatch(`/galleries/${galleryId}/photos/${photoId}`, { isHidden: !isHidden });
    await load();
  }

  async function handleRemovePhoto(photoId: string) {
    if (!galleryId) return;
    await apiFetch(`/galleries/${galleryId}/photos/${photoId}`, { method: "DELETE" });
    await load();
    onChanged();
  }

  async function handleDeliver() {
    if (!galleryId) return;
    await apiPost(`/galleries/${galleryId}/deliver`);
    await load();
    onChanged();
  }

  if (!gallery) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={gallery.title ?? "Gallery"} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">{gallery.status}</Badge>
          <Badge variant="outline" className="capitalize">{gallery.layout}</Badge>
          {gallery.status !== "delivered" && <Button type="button" size="sm" onClick={() => void handleDeliver()}>Mark delivered</Button>}
        </div>

        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated QR PNG */}
          <img src={`${apiBase}/galleries/${gallery.id}/qr`} alt="Gallery QR code" className="h-24 w-24 rounded-md border border-border" />
          <div className="flex flex-1 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-sm font-medium"><QrCode className="h-4 w-4" aria-hidden="true" />Unique link</p>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="text-xs" />
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => void handleCopyLink()}><Copy className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
            {copied && <span className="text-xs text-muted-foreground">Copied.</span>}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div><p className="font-display text-xl">{gallery.photoCount}</p><p className="text-xs text-muted-foreground">Photos</p></div>
            <div><p className="font-display text-xl">{stats.favoriteCount}</p><p className="text-xs text-muted-foreground">Favorites</p></div>
            <div><p className="font-display text-xl">{stats.downloadCount}</p><p className="text-xs text-muted-foreground">Downloads</p></div>
            <div><p className="font-display text-xl">{stats.uniqueGuestCount}</p><p className="text-xs text-muted-foreground">Guests</p></div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Photos</h3>
          <ul className="mb-4 flex flex-col divide-y divide-border">
            {gallery.photos.map((photo) => (
              <li key={photo.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {photo.thumbnailKey && (
                    // eslint-disable-next-line @next/next/no-img-element -- private signed-URL storage thumbnail, not eligible for Next's image optimizer
                    <img src={`${apiBase}/galleries/${gallery.id}/photos/${photo.id}/thumbnail`} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                  )}
                  <span className="truncate">{photo.category ?? "Uncategorized"}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleToggleHidden(photo.id, photo.isHidden)}>
                    {photo.isHidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleRemovePhoto(photo.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                </div>
              </li>
            ))}
            {gallery.photos.length === 0 && <p className="py-2 text-xs text-muted-foreground">No photos uploaded yet.</p>}
          </ul>

          <UploadPanel galleryId={gallery.id} onPhotoAdded={() => void handlePhotoAdded()} />
        </div>

        <FaceSearchPanel
          galleryId={gallery.id}
          faceSearchEnabled={gallery.faceSearchEnabled}
          confidenceThreshold={gallery.faceSearchConfidenceThreshold}
          retentionDays={gallery.faceSearchRetentionDays}
          onChanged={() => void load()}
        />

        <PhotoIntelligencePanel galleryId={gallery.id} />

        <CullingPanel galleryId={gallery.id} />

        <AlbumSuggestionPanel galleryId={gallery.id} />
      </div>
    </ResponsiveDialog>
  );
}
