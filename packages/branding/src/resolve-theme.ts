import { PLATFORM_DEFAULT_THEME } from "./platform-default";
import type { BrandTheme, PartialBrandTheme } from "./theme-schema";

export type ThemeSource = "platform" | "studio" | "branch";

export interface ResolvedTheme {
  theme: BrandTheme;
  /** Which layer supplied each top-level field — powers "customized at branch level" indicators in a theme editor UI. */
  sources: Partial<Record<keyof BrandTheme, ThemeSource>>;
}

function mergeLayer(
  base: BrandTheme,
  sources: Partial<Record<keyof BrandTheme, ThemeSource>>,
  overrides: PartialBrandTheme | undefined,
  sourceLabel: ThemeSource,
): BrandTheme {
  if (!overrides) return base;
  const merged = { ...base };
  for (const key of Object.keys(overrides) as (keyof BrandTheme)[]) {
    const value = overrides[key];
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
      sources[key] = sourceLabel;
    }
  }
  return merged;
}

/**
 * Resolves the effective theme for a request: platform default is the
 * base, a studio's StudioBrand row overrides it, and a branch's
 * BranchBrand.overrides overrides that. Every layer is optional — a brand
 * new studio with no StudioBrand row yet still resolves to a complete,
 * valid theme (the platform default).
 */
export function resolveTheme(input: {
  studioOverride?: PartialBrandTheme;
  branchOverride?: PartialBrandTheme;
}): ResolvedTheme {
  const sources: Partial<Record<keyof BrandTheme, ThemeSource>> = {};
  for (const key of Object.keys(PLATFORM_DEFAULT_THEME) as (keyof BrandTheme)[]) {
    sources[key] = "platform";
  }

  let theme = PLATFORM_DEFAULT_THEME;
  theme = mergeLayer(theme, sources, input.studioOverride, "studio");
  theme = mergeLayer(theme, sources, input.branchOverride, "branch");

  return { theme, sources };
}
