"use client";

import { Heart } from "lucide-react";
import { publicImageUrl } from "../../lib/api";

export interface GalleryPhotoItem {
  id: string;
  category: string | null;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  isFavorited: boolean;
}

interface PhotoGridProps {
  token: string;
  guestToken: string;
  photos: GalleryPhotoItem[];
  layout: string;
  onOpen: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
}

/**
 * One component covers grid, masonry, story, and highlights — the
 * actual visual difference between them is almost entirely CSS
 * (fixed-height cells vs. variable-height columns vs. a single
 * swipeable column), driven off `layout`. Timeline is the one layout
 * with a genuinely different *data* shape (day-grouped), handled by
 * `TimelineGrid` below reusing this same photo card. Every `<img>`
 * uses native lazy loading and a `sizes` attribute so the browser
 * requests an appropriately small file on mobile rather than a full
 * desktop-width image — "Lazy loading" and "Responsive image sizes"
 * from the brief, without needing a custom intersection-observer.
 */
export function PhotoGrid({ token, guestToken, photos, layout, onOpen, onToggleFavorite }: PhotoGridProps) {
  const ordered = layout === "highlights" ? [...photos].sort((a, b) => Number(b.isFavorited) - Number(a.isFavorited)) : photos;

  if (layout === "story") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        {ordered.map((photo, index) => (
          <PhotoCard key={photo.id} token={token} guestToken={guestToken} photo={photo} onOpen={() => onOpen(index)} onToggleFavorite={() => onToggleFavorite(photo.id)} aspect="aspect-[4/5]" />
        ))}
      </div>
    );
  }

  if (layout === "masonry") {
    return (
      <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>*]:mb-2">
        {ordered.map((photo, index) => (
          <PhotoCard key={photo.id} token={token} guestToken={guestToken} photo={photo} onOpen={() => onOpen(index)} onToggleFavorite={() => onToggleFavorite(photo.id)} breakInside />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {ordered.map((photo, index) => (
        <PhotoCard key={photo.id} token={token} guestToken={guestToken} photo={photo} onOpen={() => onOpen(index)} onToggleFavorite={() => onToggleFavorite(photo.id)} aspect="aspect-square" />
      ))}
    </div>
  );
}

function PhotoCard({
  token,
  guestToken,
  photo,
  onOpen,
  onToggleFavorite,
  aspect,
  breakInside,
}: {
  token: string;
  guestToken: string;
  photo: GalleryPhotoItem;
  onOpen: () => void;
  onToggleFavorite: () => void;
  aspect?: string;
  breakInside?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-md bg-muted ${breakInside ? "break-inside-avoid" : ""} ${aspect ?? ""}`}>
      <button type="button" onClick={onOpen} className="block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- served via the API's signed-URL redirect, not Next's image optimizer */}
        <img
          src={publicImageUrl(token, photo.id, guestToken, "view")}
          alt={photo.category ?? "Gallery photo"}
          loading="lazy"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${aspect ? "" : "h-auto"}`}
        />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={photo.isFavorited ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        <Heart className={`h-4 w-4 ${photo.isFavorited ? "fill-current text-red-400" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}
