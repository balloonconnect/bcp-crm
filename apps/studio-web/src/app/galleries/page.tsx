"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState, Input } from "@bcp/ui";
import { apiGet } from "../../lib/api-client";
import { GalleryFormDialog } from "../../components/galleries/gallery-form-dialog";
import { GalleryDetailDialog } from "../../components/galleries/gallery-detail-dialog";

interface GalleryRecord {
  id: string;
  title: string | null;
  status: string;
  photoCount: number;
  layout: string;
}

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success"> = { pending_upload: "outline", uploaded: "warning", delivered: "success" };

export default function GalleriesPage() {
  const [galleries, setGalleries] = React.useState<GalleryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [eventId, setEventId] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<GalleryRecord[]>("/galleries");
    if (res.ok && res.data) setGalleries(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8" data-tour="galleries-list">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Galleries</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Event ID" value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-64" />
          <Button type="button" size="sm" disabled={!eventId} onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New gallery
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading galleries…" />
      ) : galleries.length === 0 ? (
        <EmptyState title="No galleries yet" description="Paste an event's ID above and create its gallery to get a shareable link, QR code, and delivery settings." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <button key={gallery.id} type="button" onClick={() => setDetailId(gallery.id)} className="flex flex-col gap-1 rounded-md border border-border p-3 text-left hover:bg-accent">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{gallery.title ?? "Untitled gallery"}</span>
                <Badge variant={STATUS_VARIANT[gallery.status] ?? "outline"} className="capitalize">{gallery.status.replace(/_/g, " ")}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{gallery.photoCount} photos · {gallery.layout}</span>
            </button>
          ))}
        </div>
      )}

      {eventId && <GalleryFormDialog eventId={eventId} open={formOpen} onOpenChange={setFormOpen} onSaved={load} />}
      <GalleryDetailDialog galleryId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
