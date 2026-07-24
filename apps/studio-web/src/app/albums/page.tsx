"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button, Badge, LoadingState, EmptyState, Input } from "@bcp/ui";
import { apiGet, apiPost } from "../../lib/api-client";
import { AlbumDetailDialog } from "../../components/albums/album-detail-dialog";

interface AlbumRecord { id: string; status: string }

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success"> = {
  pending_selection: "outline", selection_in_progress: "warning", design_pending: "warning", printing: "warning", completed: "success",
};

export default function AlbumsPage() {
  const [albums, setAlbums] = React.useState<AlbumRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [eventId, setEventId] = React.useState("");
  const [sourceGalleryId, setSourceGalleryId] = React.useState("");
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await apiGet<AlbumRecord[]>("/albums");
    if (res.ok && res.data) setAlbums(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!eventId) return;
    const res = await apiPost<AlbumRecord>(`/events/${eventId}/albums`, { sourceGalleryId: sourceGalleryId || undefined });
    if (res.ok && res.data) {
      setEventId(""); setSourceGalleryId("");
      await load();
      setDetailId(res.data.id);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8" data-tour="albums-list">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Albums</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Event ID" value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-56" />
          <Input placeholder="Source gallery ID" value={sourceGalleryId} onChange={(e) => setSourceGalleryId(e.target.value)} className="w-56" />
          <Button type="button" size="sm" disabled={!eventId} onClick={() => void handleCreate()}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New album
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading albums…" />
      ) : albums.length === 0 ? (
        <EmptyState title="No albums yet" description="Paste an event's ID (and, to let clients pick from delivered photos, its gallery's ID) above to start a selection." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <button key={album.id} type="button" onClick={() => setDetailId(album.id)} className="flex items-center justify-between rounded-md border border-border p-3 text-left hover:bg-accent">
              <span className="text-sm font-medium">Album</span>
              <Badge variant={STATUS_VARIANT[album.status] ?? "outline"} className="capitalize">{album.status.replace(/_/g, " ")}</Badge>
            </button>
          ))}
        </div>
      )}

      <AlbumDetailDialog albumId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} onChanged={load} />
    </main>
  );
}
