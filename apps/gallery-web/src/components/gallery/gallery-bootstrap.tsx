"use client";

import * as React from "react";
import { publicApiFetch } from "../../lib/api";
import { getStoredGuestToken } from "../../lib/guest-token";
import { getStudioThemeStyle } from "../../lib/theme";
import { GalleryViewer, type SessionResponse } from "./gallery-viewer";

/** Resumes an existing guest session (from localStorage) if one exists for this gallery, or starts a fresh one — the one client-side step that has to happen before rendering anything else, since even an "open" gallery needs a guestToken to attribute favorites/comments/downloads to. Studio branding (and, via the platform's existing custom-domain resolution, whichever domain the link was actually opened on) is applied as soon as the session response reveals which studio this gallery belongs to. */
export function GalleryBootstrap({ token }: { token: string }) {
  const [session, setSession] = React.useState<SessionResponse | null>(null);
  const [themeStyle, setThemeStyle] = React.useState<React.CSSProperties>({});
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    const existingGuestToken = getStoredGuestToken(token) ?? undefined;
    void publicApiFetch<SessionResponse>(`/public/galleries/${token}/session`, { method: "POST", body: JSON.stringify({ guestToken: existingGuestToken }) }).then(async (res) => {
      if (!res.ok || !res.data) {
        setNotFound(true);
        return;
      }
      setSession(res.data);
      const { style } = await getStudioThemeStyle(res.data.studioSlug);
      setThemeStyle(style);
    });
  }, [token]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-display text-xl">Gallery not found</h1>
        <p className="text-sm text-muted-foreground">This link may be incorrect or the gallery may have been removed.</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={themeStyle}>
      <GalleryViewer token={token} initialSession={session} />
    </div>
  );
}
