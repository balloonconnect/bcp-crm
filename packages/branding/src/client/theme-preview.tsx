"use client";

import * as React from "react";
import { breakpoints } from "@bcp/ui";
import { BrandThemeProvider } from "./theme-provider";
import type { BrandTheme } from "../theme-schema";

export type PreviewDevice = "mobile" | "tablet" | "desktop";

/**
 * Widths chosen to sit mid-range within each of @bcp/ui's six breakpoint
 * tiers (packages/ui/src/tokens/breakpoints.ts) — the same scale the rest
 * of the product is built against, so what a theme editor shows here
 * matches what the real app looks like at that width. Mobile uses the
 * "standard mobile" tier (375–639px) rather than "small mobile" since
 * that's the more common real-device width; tablet uses "tablet
 * landscape" (768–1023px); desktop uses the base "desktop" tier
 * (1024–1439px) rather than large-desktop, so the preview fits inside a
 * typical theme-editor panel.
 */
const PREVIEW_WIDTHS: Record<PreviewDevice, number> = {
  mobile: 390,
  tablet: 820,
  desktop: 1280,
};

const PREVIEW_HEIGHTS: Record<PreviewDevice, number> = {
  mobile: 720,
  tablet: 800,
  desktop: 760,
};

export interface ThemePreviewProps {
  theme: BrandTheme;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Real-time preview surface: re-renders immediately whenever `theme`
 * changes (a controlled prop, not internal state) — the theme editor
 * driving this passes updated form values straight through on every
 * keystroke/color-pick, so there's no separate "apply" step needed for
 * the preview itself (only for actually persisting the theme).
 */
export function ThemePreview({ theme, device, onDeviceChange, children, className }: ThemePreviewProps) {
  return (
    <div className={className}>
      <div role="group" aria-label="Preview device" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(Object.keys(PREVIEW_WIDTHS) as PreviewDevice[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDeviceChange(d)}
            aria-pressed={device === d}
            style={{
              minHeight: 44,
              padding: "0 12px",
              borderRadius: 6,
              border: "1px solid #E5E7EB",
              background: device === d ? "#14161A" : "transparent",
              color: device === d ? "#FFFFFF" : "#14161A",
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div
        style={{
          width: PREVIEW_WIDTHS[device],
          height: PREVIEW_HEIGHTS[device],
          maxWidth: "100%",
          overflow: "auto",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          margin: device === "desktop" ? undefined : "0 auto",
          transition: "width 0.2s ease, height 0.2s ease",
        }}
      >
        <BrandThemeProvider theme={theme} scopeSelector=".bcp-theme-preview-root">
          <div className="bcp-theme-preview-root" style={{ minHeight: "100%" }}>
            {children}
          </div>
        </BrandThemeProvider>
      </div>
    </div>
  );
}

/** Re-exported so consumers don't need a separate import from @bcp/ui just for this. */
export const PREVIEW_BREAKPOINT_REFERENCE = breakpoints;
