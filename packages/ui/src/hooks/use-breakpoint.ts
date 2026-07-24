"use client";

import { useMediaQuery } from "./use-media-query";
import { breakpoints, mediaQueries, type DeviceClass } from "../tokens/breakpoints";

/**
 * Prefer CSS (Tailwind responsive classes) for layout wherever possible —
 * these hooks exist only for the cases that genuinely need JS branching,
 * like swapping a sidebar for a bottom-sheet-triggering component tree,
 * or deciding whether to lazy-mount a desktop-only widget at all.
 */
export function useIsBreakpoint(token: keyof typeof mediaQueries): boolean {
  return useMediaQuery(mediaQueries[token]);
}

/** Coarse device class: "mobile" | "tablet" | "desktop". Drives navigation pattern choice. */
export function useDeviceClass(): DeviceClass {
  const isTabletUp = useMediaQuery(mediaQueries.sm);
  const isDesktopUp = useMediaQuery(mediaQueries.lg);

  if (isDesktopUp) return "desktop";
  if (isTabletUp) return "tablet";
  return "mobile";
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export { breakpoints };
