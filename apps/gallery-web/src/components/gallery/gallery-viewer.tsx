"use client";

import * as React from "react";
import { groupPhotosByDay } from "@bcp/gallery";
import { publicApiFetch } from "../../lib/api";
import { storeGuestToken } from "../../lib/guest-token";
import { AccessGate } from "./access-gate";
import { PhotoGrid, type GalleryPhotoItem } from "./photo-grid";
import { Lightbox } from "./lightbox";
import { FaceSearchFlow } from "./face-search-flow";

export interface SessionResponse {
  guestToken: string;
  accessResult: "granted" | "expired" | "needs_password" | "needs_otp";
  studioSlug: string;
  studioName: string;
  gallery: { title: string | null; description: string | null; layout: string; photoCount: number; allowOriginalDownload: boolean; allowCompressedDownload: boolean; faceSearchEnabled: boolean };
}

export function GalleryViewer({ token, initialSession }: { token: string; initialSession: SessionResponse }) {
  const [guestToken] = React.useState(initialSession.guestToken);
  const [accessResult, setAccessResult] = React.useState(initialSession.accessResult);
  const galleryConfig = initialSession.gallery;
  const [photos, setPhotos] = React.useState<GalleryPhotoItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [faceSearchOpen, setFaceSearchOpen] = React.useState(false);
  const [commentName, setCommentName] = React.useState("");
  const [commentBody, setCommentBody] = React.useState("");
  const [comments, setComments] = React.useState<{ id: string; guestName: string; body: string }[]>([]);

  React.useEffect(() => {
    storeGuestToken(token, guestToken);
  }, [token, guestToken]);

  const loadPhotos = React.useCallback(async () => {
    const res = await publicApiFetch<GalleryPhotoItem[]>(`/public/galleries/${token}/photos?guestToken=${encodeURIComponent(guestToken)}`);
    if (res.ok && res.data) setPhotos(res.data);
  }, [token, guestToken]);

  const loadComments = React.useCallback(async () => {
    const res = await publicApiFetch<{ id: string; guestName: string; body: string }[]>(`/public/galleries/${token}/comments?guestToken=${encodeURIComponent(guestToken)}`);
    if (res.ok && res.data) setComments(res.data);
  }, [token, guestToken]);

  React.useEffect(() => {
    if (accessResult === "granted") {
      void loadPhotos();
      void loadComments();
    }
  }, [accessResult, loadPhotos, loadComments]);

  async function handleToggleFavorite(photoId: string) {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, isFavorited: !p.isFavorited } : p)));
    await publicApiFetch(`/public/galleries/${token}/photos/${photoId}/favorite`, { method: "POST", body: JSON.stringify({ guestToken }) });
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentName.trim() || !commentBody.trim()) return;
    await publicApiFetch(`/public/galleries/${token}/comments`, { method: "POST", body: JSON.stringify({ guestToken, guestName: commentName, body: commentBody }) });
    setCommentBody("");
    await loadComments();
  }

  if (accessResult !== "granted") {
    return <AccessGate token={token} guestToken={guestToken} initialResult={accessResult} onGranted={() => setAccessResult("granted")} />;
  }

  const dayGroups = galleryConfig.layout === "timeline" ? groupPhotosByDay(photos.map((p) => ({ id: p.id, uploadedAt: new Date(p.uploadedAt), order: 0 }))) : null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="mx-auto max-w-6xl px-4 py-8 text-center sm:py-12">
        {galleryConfig.title && <h1 className="font-display text-2xl sm:text-3xl">{galleryConfig.title}</h1>}
        {galleryConfig.description && <p className="mt-2 text-sm text-muted-foreground">{galleryConfig.description}</p>}
        {galleryConfig.faceSearchEnabled && (
          <button type="button" onClick={() => setFaceSearchOpen(true)} className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">
            Find my photos
          </button>
        )}
      </header>

      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        {dayGroups ? (
          <div className="flex flex-col gap-8">
            {dayGroups.map((group) => {
              const groupPhotos = photos.filter((p) => group.photos.some((gp) => gp.id === p.id));
              return (
                <div key={group.dateKey}>
                  <h2 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">{new Date(group.dateKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h2>
                  <PhotoGrid
                    token={token}
                    guestToken={guestToken}
                    photos={groupPhotos}
                    layout="grid"
                    onOpen={(i) => setLightboxIndex(photos.findIndex((p) => p.id === groupPhotos[i]!.id))}
                    onToggleFavorite={(id) => void handleToggleFavorite(id)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <PhotoGrid token={token} guestToken={guestToken} photos={photos} layout={galleryConfig.layout} onOpen={setLightboxIndex} onToggleFavorite={(id) => void handleToggleFavorite(id)} />
        )}

        {photos.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No photos to show yet.</p>}
      </div>

      <section className="mx-auto mt-12 max-w-2xl px-4">
        <h2 className="mb-3 font-display text-lg">Comments</h2>
        <ul className="mb-4 flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{c.guestName}</p>
              <p className="text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddComment} className="flex flex-col gap-2">
          <input placeholder="Your name" value={commentName} onChange={(e) => setCommentName(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <textarea placeholder="Leave a comment…" rows={2} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">Post</button>
        </form>
      </section>

      {faceSearchOpen && (
        <FaceSearchFlow
          token={token}
          guestToken={guestToken}
          onClose={() => setFaceSearchOpen(false)}
          onOpenPhoto={(photoId) => {
            const index = photos.findIndex((p) => p.id === photoId);
            if (index >= 0) {
              setFaceSearchOpen(false);
              setLightboxIndex(index);
            }
          }}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          token={token}
          guestToken={guestToken}
          photos={photos}
          index={lightboxIndex}
          allowOriginalDownload={galleryConfig.allowOriginalDownload}
          allowCompressedDownload={galleryConfig.allowCompressedDownload}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onToggleFavorite={(id) => void handleToggleFavorite(id)}
        />
      )}
    </div>
  );
}
