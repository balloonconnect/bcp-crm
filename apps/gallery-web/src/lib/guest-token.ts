"use client";

/** The guest's session identity for one gallery — an opaque token issued by the API on first visit, persisted in localStorage so returning to the same link (or the same device later) resumes the session instead of starting a fresh password/OTP challenge every time. Scoped per-gallery (keyed by publicToken) since a guest browsing two different galleries is two separate sessions. */
export function getStoredGuestToken(publicToken: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`gallery-guest-token:${publicToken}`);
}

export function storeGuestToken(publicToken: string, guestToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`gallery-guest-token:${publicToken}`, guestToken);
}
