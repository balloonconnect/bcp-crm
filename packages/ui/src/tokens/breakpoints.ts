/**
 * Canonical breakpoint scale for BCP Studio OS. Mobile-first: each named
 * breakpoint is the min-width at which that layout tier begins. The implicit
 * "base" tier (no prefix) covers small mobile, 320–374px.
 *
 * | Token | Min-width | Range          | Tier               |
 * |-------|-----------|----------------|--------------------|
 * | base  | 0px       | 320px – 374px  | small mobile       |
 * | xs    | 375px     | 375px – 639px  | standard mobile    |
 * | sm    | 640px     | 640px – 767px  | tablet portrait    |
 * | md    | 768px     | 768px – 1023px | tablet landscape   |
 * | lg    | 1024px    | 1024px – 1439px| desktop            |
 * | xl    | 1440px    | 1440px and up  | large desktop      |
 *
 * These map 1:1 to the `screens` override in packages/config/tailwind/preset.ts —
 * keep both in sync if this scale ever changes.
 */
export const breakpoints = {
  base: 0,
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export type BreakpointToken = keyof typeof breakpoints;

/** Human-readable tier names, used in Storybook and any debug UI. */
export const breakpointLabels: Record<BreakpointToken, string> = {
  base: "Small mobile (320–374px)",
  xs: "Standard mobile (375–639px)",
  sm: "Tablet portrait (640–767px)",
  md: "Tablet landscape (768–1023px)",
  lg: "Desktop (1024–1439px)",
  xl: "Large desktop (1440px+)",
};

/**
 * Coarser device classes used to switch entire navigation *patterns*
 * (sidebar vs. drawer vs. bottom nav) rather than fine-tune spacing.
 * See docs/navigation.md for the mapping rationale.
 */
export type DeviceClass = "mobile" | "tablet" | "desktop";

export function deviceClassForWidth(width: number): DeviceClass {
  if (width < breakpoints.sm) return "mobile"; // base + xs → 0–639px
  if (width < breakpoints.lg) return "tablet"; // sm + md → 640–1023px
  return "desktop"; // lg + xl → 1024px+
}

/** Ordered list, widest-matching-first, for resolving "current breakpoint". */
export const orderedBreakpointEntries = (
  Object.entries(breakpoints) as [BreakpointToken, number][]
).sort((a, b) => b[1] - a[1]);

export function breakpointForWidth(width: number): BreakpointToken {
  for (const [token, minWidth] of orderedBreakpointEntries) {
    if (width >= minWidth) return token;
  }
  return "base";
}

/** Media query strings, handy outside of Tailwind (e.g. in JS-driven hooks). */
export const mediaQueries: Record<BreakpointToken, string> = {
  base: `(min-width: ${breakpoints.base}px)`,
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
};
