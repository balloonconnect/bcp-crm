import type React from "react";
import { themeToCssVariables, type BrandTheme } from "@bcp/branding";
import { publicApiFetch } from "./api";

/** Fetches a studio's public brand theme and turns it into a React style object (CSS custom properties) — same `themeToCssVariables` helper the gallery and client-portal appliers already use, applied here to the enquiry form's wrapper element so the page picks up the studio's colors, logo, and typography without any bespoke CSS-var logic of its own. */
export async function getStudioThemeStyle(studioSlug: string): Promise<{ style: React.CSSProperties; theme: BrandTheme | null }> {
  const res = await publicApiFetch<BrandTheme>(`/public/branding?studioSlug=${encodeURIComponent(studioSlug)}`);
  if (!res.ok || !res.data) return { style: {}, theme: null };
  return { style: themeToCssVariables(res.data) as React.CSSProperties, theme: res.data };
}
