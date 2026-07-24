import type React from "react";
import { themeToCssVariables, type BrandTheme } from "@bcp/branding";
import { publicApiFetch } from "./api";

/** Applies the sending studio's brand theme (and, via the platform's custom-domain resolution already built for the client portal, whatever domain the gallery link was actually opened on) — same `themeToCssVariables` helper `apps/client-portal` uses. */
export async function getStudioThemeStyle(studioSlug: string): Promise<{ style: React.CSSProperties; theme: BrandTheme | null }> {
  const res = await publicApiFetch<BrandTheme>(`/public/branding?studioSlug=${encodeURIComponent(studioSlug)}`);
  if (!res.ok || !res.data) return { style: {}, theme: null };
  return { style: themeToCssVariables(res.data) as React.CSSProperties, theme: res.data };
}
