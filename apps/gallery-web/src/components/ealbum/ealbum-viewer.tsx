"use client";

import * as React from "react";
import { publicApiFetch } from "../../lib/api";
import { getStudioThemeStyle } from "../../lib/theme";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SessionResponse {
  guestToken: string;
  accessResult: "granted" | "needs_password" | "needs_otp";
  studioSlug: string;
  studioName: string;
  downloadEnabled: boolean;
}

interface EAlbumPage {
  id: string;
  spreadNumber: number;
}

function pageImageUrl(token: string, pageId: string, guestToken: string): string {
  return `${API_URL}/public/ealbum/${token}/pages/${pageId}/image?guestToken=${encodeURIComponent(guestToken)}`;
}

function getStoredGuestToken(token: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`ealbum-guest-token:${token}`);
}
function storeGuestToken(token: string, guestToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`ealbum-guest-token:${token}`, guestToken);
}

/**
 * The 3D e-album page-flip viewer — a CSS 3D perspective flip driven
 * by swipe (mobile) or arrow keys/click (desktop), the same
 * touch-delta gesture approach `apps/gallery-web`'s photo lightbox
 * (Prompt 26) already uses for swipe, and the same pinch-to-zoom
 * scale-transform approach it uses there too — applied here per-page
 * instead of per-photo.
 */
export function EAlbumViewer({ token }: { token: string }) {
  const [session, setSession] = React.useState<SessionResponse | null>(null);
  const [themeStyle, setThemeStyle] = React.useState<React.CSSProperties>({});
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [otpSent, setOtpSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<EAlbumPage[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [flipping, setFlipping] = React.useState<"forward" | "backward" | null>(null);
  const [scale, setScale] = React.useState(1);
  const touchStartX = React.useRef<number | null>(null);
  const pinchStartDistance = React.useRef<number | null>(null);

  React.useEffect(() => {
    const existingGuestToken = getStoredGuestToken(token) ?? undefined;
    void publicApiFetch<SessionResponse>(`/public/ealbum/${token}/session`, { method: "POST", body: JSON.stringify({ guestToken: existingGuestToken }) }).then(async (res) => {
      if (!res.ok || !res.data) return;
      setSession(res.data);
      storeGuestToken(token, res.data.guestToken);
      const { style } = await getStudioThemeStyle(res.data.studioSlug);
      setThemeStyle(style);
    });
  }, [token]);

  const loadPages = React.useCallback(async () => {
    if (!session) return;
    const res = await publicApiFetch<EAlbumPage[]>(`/public/ealbum/${token}/pages?guestToken=${encodeURIComponent(session.guestToken)}`);
    if (res.ok && res.data) setPages(res.data);
  }, [token, session]);

  React.useEffect(() => {
    if (session?.accessResult === "granted") void loadPages();
  }, [session, loadPages]);

  async function handleVerifyPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const res = await publicApiFetch(`/public/ealbum/${token}/verify-password`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, password }) });
    if (!res.ok) {
      setPasswordError("Incorrect password.");
      return;
    }
    // Re-check full access (password alone may not be enough if OTP is also required) by re-fetching the session rather than guessing the next state.
    const refreshed = await publicApiFetch<SessionResponse>(`/public/ealbum/${token}/session`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken }) });
    if (refreshed.ok && refreshed.data) setSession(refreshed.data);
  }

  async function handleRequestOtp() {
    if (!session) return;
    await publicApiFetch(`/public/ealbum/${token}/request-otp`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, email }) });
    setOtpSent(true);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const res = await publicApiFetch(`/public/ealbum/${token}/verify-otp`, { method: "POST", body: JSON.stringify({ guestToken: session.guestToken, code }) });
    if (!res.ok) {
      setOtpError("Incorrect or expired code.");
      return;
    }
    setSession({ ...session, accessResult: "granted" });
  }

  function goToPage(index: number) {
    if (index < 0 || index >= pages.length || flipping) return;
    setFlipping(index > currentPage ? "forward" : "backward");
    window.setTimeout(() => {
      setCurrentPage(index);
      setFlipping(null);
    }, 300);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      pinchStartDistance.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    } else {
      touchStartX.current = e.touches[0]!.clientX;
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDistance.current) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setScale(Math.min(3, Math.max(1, scale * (distance / pinchStartDistance.current))));
      pinchStartDistance.current = distance;
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    pinchStartDistance.current = null;
    if (scale > 1 || touchStartX.current === null) {
      touchStartX.current = null;
      return;
    }
    const delta = e.changedTouches[0]!.clientX - touchStartX.current;
    if (delta < -60) goToPage(currentPage + 1);
    else if (delta > 60) goToPage(currentPage - 1);
    touchStartX.current = null;
  }

  async function handleDownload() {
    if (!session) return;
    const res = await publicApiFetch<string[]>(`/public/ealbum/${token}/download?guestToken=${encodeURIComponent(session.guestToken)}`);
    if (res.ok && res.data) {
      for (const url of res.data) window.open(url, "_blank");
    }
  }

  if (!session) return null;

  if (session.accessResult === "needs_password") {
    return (
      <div style={themeStyle} className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6 text-white">
        <h1 className="font-display text-xl">{session.studioName}</h1>
        <form onSubmit={handleVerifyPassword} className="flex w-full max-w-xs flex-col gap-3">
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-md border border-white/20 bg-white/10 px-3 text-base text-white" autoFocus />
          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          <button type="submit" className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Continue</button>
        </form>
      </div>
    );
  }

  if (session.accessResult === "needs_otp") {
    return (
      <div style={themeStyle} className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6 text-white">
        <h1 className="font-display text-xl">{session.studioName}</h1>
        {!otpSent ? (
          <div className="flex w-full max-w-xs flex-col gap-3">
            <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-md border border-white/20 bg-white/10 px-3 text-base text-white" />
            <button type="button" onClick={() => void handleRequestOtp()} className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Send code</button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex w-full max-w-xs flex-col gap-3">
            <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="h-11 rounded-md border border-white/20 bg-white/10 px-3 text-center text-base tracking-widest text-white" autoFocus />
            {otpError && <p className="text-sm text-red-400">{otpError}</p>}
            <button type="submit" className="h-11 rounded-md bg-brand text-sm font-medium text-brand-foreground">Verify</button>
          </form>
        )}
      </div>
    );
  }

  const page = pages[currentPage];

  return (
    <div style={themeStyle} className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-between p-3">
        <span className="text-sm">{session.studioName}</span>
        <span className="text-xs text-white/60">{currentPage + 1} / {pages.length}</span>
        {session.downloadEnabled && (
          <button type="button" onClick={() => void handleDownload()} className="rounded-md bg-white/10 px-3 py-1.5 text-xs">Download</button>
        )}
      </header>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{ perspective: "1600px" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {page && (
          <div
            className="aspect-[3/2] max-h-[80vh] w-full max-w-3xl transition-transform duration-300"
            style={{ transform: `${flipping ? `rotateY(${flipping === "forward" ? "-15deg" : "15deg"})` : "rotateY(0deg)"} scale(${scale})`, transformStyle: "preserve-3d" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed-URL storage image, page-flip viewer needs direct transform control */}
            <img src={pageImageUrl(token, page.id, session.guestToken)} alt={`Page ${page.spreadNumber}`} className="h-full w-full rounded-md object-contain shadow-2xl" />
          </div>
        )}

        <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous page" className="absolute left-2 hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30 sm:flex">‹</button>
        <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pages.length - 1} aria-label="Next page" className="absolute right-2 hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 disabled:opacity-30 sm:flex">›</button>
      </div>

      <div className="flex justify-center gap-1 overflow-x-auto p-3">
        {pages.map((p, i) => (
          <button key={p.id} type="button" onClick={() => goToPage(i)} className={`h-1.5 w-6 shrink-0 rounded-full ${i === currentPage ? "bg-brand" : "bg-white/20"}`} aria-label={`Go to page ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
