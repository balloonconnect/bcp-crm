export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
    else h = (rNorm - gNorm) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexToHsl(hex: string): HslColor {
  return rgbToHsl(hexToRgb(hex));
}

/** Formats as the "H S% L%" triplet our CSS custom properties expect (used inside `hsl(var(--x))`). */
export function hslToTriplet(hsl: HslColor): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

export function hexToHslTriplet(hex: string): string {
  return hslToTriplet(hexToHsl(hex));
}

/** WCAG relative luminance — see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
export function relativeLuminance(rgb: RgbColor): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Picks black or white text — whichever gives higher contrast against the given background. */
export function readableForegroundFor(backgroundHex: string): "#000000" | "#FFFFFF" {
  const luminance = relativeLuminance(hexToRgb(backgroundHex));
  return luminance > 0.4 ? "#000000" : "#FFFFFF";
}
