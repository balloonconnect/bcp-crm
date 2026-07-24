"use client";

/** The client's authenticated portal session token — persisted in localStorage per studio (a person who's a client of two studios has two independent sessions), so returning to the portal later resumes login rather than asking for a fresh OTP every visit within the session's own lifetime. */
export function getPortalSessionToken(studioSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`portal-session:${studioSlug}`);
}

export function storePortalSessionToken(studioSlug: string, sessionToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`portal-session:${studioSlug}`, sessionToken);
}

export function clearPortalSessionToken(studioSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`portal-session:${studioSlug}`);
}
