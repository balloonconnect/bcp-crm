import type { BrandTheme, WatermarkPosition } from "../theme-schema";

export interface WatermarkConfig {
  enabled: boolean;
  url?: string;
  opacity: number;
  position: WatermarkPosition;
}

/**
 * Resolves the watermark applied to gallery/album preview images. Absent
 * a `watermarkUrl`, watermarking is simply disabled — there is no default
 * BCP Studio OS watermark stamped onto a studio's client-facing photos.
 */
export function resolveWatermarkConfig(theme: BrandTheme): WatermarkConfig {
  return {
    enabled: Boolean(theme.watermarkUrl),
    url: theme.watermarkUrl,
    opacity: theme.watermarkOpacity,
    position: theme.watermarkPosition,
  };
}
