"use client";

/** The client's selection session identity — persisted in localStorage so closing the tab and coming back later ("resume later," a named mobile requirement) resumes the same session and its OTP verification rather than starting over. Scoped per-album (keyed by publicToken). */
export function getStoredGuestToken(publicToken: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`album-guest-token:${publicToken}`);
}

export function storeGuestToken(publicToken: string, guestToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`album-guest-token:${publicToken}`, guestToken);
}
