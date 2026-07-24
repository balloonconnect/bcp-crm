"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight, Heart, Download, Share2 } from "lucide-react";
import { publicApiFetch, publicImageUrl } from "../../lib/api";
import type { GalleryPhotoItem } from "./photo-grid";

interface LightboxProps {
  token: string;
  guestToken: string;
  photos: GalleryPhotoItem[];
  index: number;
  allowOriginalDownload: boolean;
  allowCompressedDownload: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
}

/**
 * Full-screen viewer with swipe navigation and pinch/double-tap zoom —
 * both implemented directly on top of raw touch events rather than a
 * library, since the gesture surface needed here (horizontal swipe to
 * change photo, two-finger pinch or double-tap to zoom) is small
 * enough not to justify a new dependency.
 */
export function Lightbox({ token, guestToken, photos, index, allowOriginalDownload, allowCompressedDownload, onClose, onIndexChange, onToggleFavorite }: LightboxProps) {
  const photo = photos[index];
  const [scale, setScale] = React.useState(1);
  const touchStartX = React.useRef<number | null>(null);
  const pinchStartDistance = React.useRef<number | null>(null);
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    setScale(1);
  }, [index]);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function goPrev() {
    if (index > 0) onIndexChange(index - 1);
  }
  function goNext() {
    if (index < photos.length - 1) onIndexChange(index + 1);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      pinchStartDistance.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0]!.clientX;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDistance.current) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const nextScale = Math.min(4, Math.max(1, scale * (distance / pinchStartDistance.current)));
      setScale(nextScale);
      pinchStartDistance.current = distance;
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    pinchStartDistance.current = null;
    if (scale > 1 || touchStartX.current === null) {
      touchStartX.current = null;
      return;
    }
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    if (delta > 60) goPrev();
    else if (delta < -60) goNext();
    touchStartX.current = null;
  }

  function handleDoubleClick() {
    setScale((prev) => (prev > 1 ? 1 : 2));
  }

  async function handleDownload(type: "original" | "compressed") {
    const res = await publicApiFetch<{ storageKey: string | null }>(`/public/galleries/${token}/download`, { method: "POST", body: JSON.stringify({ guestToken, photoId: photo!.id, type }) });
    if (!res.ok) return;
    const link = document.createElement("a");
    link.href = publicImageUrl(token, photo!.id, guestToken, type === "original" ? "download_original" : "download_compressed");
    link.download = "";
    link.click();
  }

  async function handleShare() {
    const url = `${window.location.origin}${window.location.pathname}?photo=${photo!.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Photo", url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setShareStatus("Link copied");
    setTimeout(() => setShareStatus(null), 2000);
  }

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm">{index + 1} / {photos.length}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onToggleFavorite(photo.id)} aria-label="Favorite" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
            <Heart className={`h-5 w-5 ${photo.isFavorited ? "fill-current text-red-400" : ""}`} aria-hidden="true" />
          </button>
          {allowCompressedDownload && (
            <button type="button" onClick={() => void handleDownload("compressed")} aria-label="Download compressed" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
              <Download className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => void handleShare()} aria-label="Share" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {shareStatus && <p className="absolute right-4 top-14 rounded bg-white px-2 py-1 text-xs text-black">{shareStatus}</p>}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onDoubleClick={handleDoubleClick}>
        <button type="button" onClick={goPrev} disabled={index === 0} aria-label="Previous photo" className="absolute left-2 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-30 sm:flex">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- API-served signed URL, viewer needs direct pixel/gesture control */}
        <img
          src={publicImageUrl(token, photo.id, guestToken, "view")}
          alt="Gallery photo"
          className="max-h-full max-w-full select-none object-contain transition-transform"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
        <button type="button" onClick={goNext} disabled={index === photos.length - 1} aria-label="Next photo" className="absolute right-2 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-30 sm:flex">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {allowOriginalDownload && (
        <div className="flex justify-center p-3">
          <button type="button" onClick={() => void handleDownload("original")} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
            Download original
          </button>
        </div>
      )}
    </div>
  );
}
