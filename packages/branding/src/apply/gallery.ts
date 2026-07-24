import type { BrandTheme } from "../theme-schema";

/** Applies the gallery-specific override on top of the resolved studio theme — public-facing, so identity fields still apply but editor-only surfaces (e.g. invoiceDesign) are irrelevant here. */
export function resolveGalleryTheme(theme: BrandTheme): BrandTheme {
  const overrides = theme.galleryTheme ?? {};
  return { ...theme, ...overrides };
}

/** The album viewer is the same public-facing surface as the gallery (same override, same watermark behavior). */
export const resolveAlbumViewerTheme = resolveGalleryTheme;
