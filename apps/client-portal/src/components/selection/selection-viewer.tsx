"use client";

import * as React from "react";
import { publicApiFetch } from "../../lib/api";
import { getStoredGuestToken, storeGuestToken } from "../../lib/guest-token";

interface SessionResponse {
  guestToken: string;
  accessResult: "granted" | "needs_otp";
  studioSlug: string;
  studioName: string;
  album: { selectionLimit: number | null; deadline: string | null; lockedAt: string | null; submittedAt: string | null };
}

interface SelectablePhoto {
  id: string;
  category: string | null;
  status: "pending" | "selected" | "rejected";
  isFavorite: boolean;
  comment: string | null;
}

function imageUrl(token: string, photoId: string, guestToken: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${apiUrl}/public/albums/${token}/photos/${photoId}/image?guestToken=${encodeURIComponent(guestToken)}`;
}

export function SelectionViewer({ token }: { token: string }) {
  const [session, setSession] = React.useState<SessionResponse | null>(null);
  const [otpSent, setOtpSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<SelectablePhoto[]>([]);
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [limitMessage, setLimitMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const existingGuestToken = getStoredGuestToken(token) ?? undefined;
    void publicApiFetch<SessionResponse>(`/public/albums/${token}/session`, { method: "POST", body: JSON.stringify({ guestToken: existingGuestToken }) }).then((res) => {
      if (res.ok && res.data) {
        setSession(res.data);
        storeGuestToken(token, res.data.guestToken);
        setSubmitted(Boolean(res.data.album.submittedAt));
      }
    });
  }, [token]);

  const loadPhotos = React.useCallback(async () => {
    if (!session) return;
    const res = await publicApiFetch<SelectablePhoto[]>(`/public/albums/${token}/photos?guestToken=${encodeURIComponent(session.guestToken)}`);
    if (res.ok && res.data) setPhotos(res.data);
  }, [token, session]);

  React.useEffect(() => {
    if (session?.accessResult === "granted") void loadPhotos();
  }, [session, loadPhotos]);

  async function handleRequestOtp() {
    if (!session) return;
    if (email) await publicApiFetch(`/public/albums/${token}/session`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, guestEmail: email }) });
    await publicApiFetch(`/public/albums/${token}/request-otp`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken }) });
    setOtpSent(true);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const res = await publicApiFetch(`/public/albums/${token}/verify-otp`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, code }) });
    if (!res.ok) {
      setOtpError("Incorrect or expired code.");
      return;
    }
    setSession({ ...session, accessResult: "granted" });
  }

  async function handleAction(photoId: string, action: "select" | "deselect" | "favorite" | "unfavorite" | "reject") {
    if (!session) return;
    setLimitMessage(null);
    const res = await publicApiFetch(`/public/albums/${token}/photos/${photoId}/action`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, action }) });
    if (!res.ok) {
      setLimitMessage(res.error?.message ?? "Couldn't apply that action.");
      return;
    }
    await loadPhotos();
  }

  async function handleComment(photoId: string, comment: string) {
    if (!session) return;
    await publicApiFetch(`/public/albums/${token}/photos/${photoId}/comment`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, comment }) });
    await loadPhotos();
  }

  async function handleSubmit() {
    if (!session) return;
    await publicApiFetch(`/public/albums/${token}/submit`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken }) });
    setSubmitted(true);
    setConfirmOpen(false);
  }

  if (!session) return null;

  if (session.accessResult === "needs_otp") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-display text-xl">{session.studioName}: verify to continue</h1>
        {!otpSent ? (
          <div className="flex w-full max-w-xs flex-col gap-3">
            <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-base" />
            <button type="button" onClick={() => void handleRequestOtp()} className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Send code</button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex w-full max-w-xs flex-col gap-3">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent you.</p>
            <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-center text-base tracking-widest" autoFocus />
            {otpError && <p className="text-sm text-destructive">{otpError}</p>}
            <button type="submit" className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Verify</button>
          </form>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-display text-xl">Thank you!</h1>
        <p className="text-sm text-muted-foreground">Your selection has been submitted to {session.studioName}. They&apos;ll be in touch about next steps.</p>
      </div>
    );
  }

  const selectedCount = photos.filter((p) => p.status === "selected").length;
  const viewerPhoto = viewerIndex !== null ? photos[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="mx-auto max-w-4xl px-4 py-6 text-center">
        <h1 className="font-display text-xl">{session.studioName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a photo to select it for your album.</p>
        {session.album.deadline && <p className="mt-1 text-xs text-muted-foreground">Please finish by {new Date(session.album.deadline).toLocaleDateString("en-IN")}</p>}
        {limitMessage && <p className="mt-2 text-sm text-destructive">{limitMessage}</p>}
      </header>

      {/* Large thumbnails — 2 columns even on the smallest phones, never a dense 4+ column grid, per the mobile requirement. */}
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2 px-2 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setViewerIndex(index)}
            className={`relative aspect-square overflow-hidden rounded-md border-2 ${photo.status === "selected" ? "border-brand" : "border-transparent"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed-URL storage image */}
            <img src={imageUrl(token, photo.id, session.guestToken)} alt="" loading="lazy" className={`h-full w-full object-cover ${photo.status === "rejected" ? "opacity-40" : ""}`} />
            {photo.status === "selected" && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-brand-foreground">✓</span>}
            {photo.isFavorite && <span className="absolute left-1.5 top-1.5 text-lg">♥</span>}
          </button>
        ))}
      </div>

      {/* Sticky selected count — always visible while scrolling a long gallery, with the primary submit action right there. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-border bg-background/95 p-3 backdrop-blur">
        <span className="text-sm font-medium">
          {selectedCount} selected{session.album.selectionLimit ? ` / ${session.album.selectionLimit}` : ""}
        </span>
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={selectedCount === 0} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50">
          Submit selection
        </button>
      </div>

      {viewerPhoto && (
        <FullScreenViewer
          photo={viewerPhoto}
          imageSrc={imageUrl(token, viewerPhoto.id, session.guestToken)}
          onClose={() => setViewerIndex(null)}
          onPrev={() => setViewerIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setViewerIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
          onAction={(action) => void handleAction(viewerPhoto.id, action)}
          onComment={(comment) => void handleComment(viewerPhoto.id, comment)}
        />
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-lg bg-background p-5 text-center">
            <h2 className="mb-2 font-display text-lg">Submit your selection?</h2>
            <p className="mb-4 text-sm text-muted-foreground">You&apos;ve selected {selectedCount} photo{selectedCount === 1 ? "" : "s"}. Once submitted, you won&apos;t be able to make further changes unless the studio reopens it.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-md border border-border px-4 py-2 text-sm">Keep editing</button>
              <button type="button" onClick={() => void handleSubmit()} className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">Confirm submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FullScreenViewer({
  photo,
  imageSrc,
  onClose,
  onPrev,
  onNext,
  onAction,
  onComment,
}: {
  photo: SelectablePhoto;
  imageSrc: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAction: (action: "select" | "deselect" | "favorite" | "unfavorite" | "reject") => void;
  onComment: (comment: string) => void;
}) {
  const [commentDraft, setCommentDraft] = React.useState(photo.comment ?? "");
  const touchStartX = React.useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]!.clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0]!.clientX - touchStartX.current;
    if (delta > 60) onPrev();
    else if (delta < -60) onNext();
    touchStartX.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-end p-3">
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">✕</button>
      </div>
      <div className="relative flex flex-1 items-center justify-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* eslint-disable-next-line @next/next/no-img-element -- private signed-URL storage image */}
        <img src={imageSrc} alt="" className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-col gap-3 bg-background p-4">
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => onAction(photo.status === "selected" ? "deselect" : "select")} className={`flex-1 rounded-md px-4 py-3 text-sm font-medium ${photo.status === "selected" ? "bg-brand text-brand-foreground" : "border border-border"}`}>
            {photo.status === "selected" ? "✓ Selected" : "Select"}
          </button>
          <button type="button" onClick={() => onAction(photo.isFavorite ? "unfavorite" : "favorite")} className="rounded-md border border-border px-4 py-3 text-sm">
            {photo.isFavorite ? "♥ Favorited" : "♡ Favorite"}
          </button>
          <button type="button" onClick={() => onAction("reject")} className={`rounded-md px-4 py-3 text-sm ${photo.status === "rejected" ? "bg-destructive text-destructive-foreground" : "border border-border"}`}>
            Reject
          </button>
        </div>
        <div className="flex gap-2">
          <input placeholder="Add a comment…" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
          <button type="button" onClick={() => onComment(commentDraft)} className="rounded-md border border-border px-3 text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}
