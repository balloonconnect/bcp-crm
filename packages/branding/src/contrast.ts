import { hexToRgb, relativeLuminance } from "./colors";
import type { BrandTheme } from "./theme-schema";

/** WCAG contrast ratio between two colors, 1 (no contrast) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = "AA" | "AA-large" | "fail";

/** WCAG 2.2 thresholds: 4.5:1 for normal text (AA), 3:1 for large text/UI components. */
export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

export interface ContrastCheck {
  pair: string;
  foreground: string;
  background: string;
  ratio: number;
  level: ContrastLevel;
  /** true if this pair is normal body text (needs 4.5:1) vs. large text/UI (needs only 3:1). */
  requiresAA: boolean;
  passes: boolean;
}

export interface ContrastValidationResult {
  checks: ContrastCheck[];
  passes: boolean;
  failures: ContrastCheck[];
}

/**
 * Validates the pairs that actually get rendered together in the product:
 * body text on the background, and each brand color used as a button/
 * badge fill against its auto-computed readable foreground. Called before
 * saving a theme so a studio can't accidentally ship unreadable text —
 * see apps/api's branding.service.ts, which surfaces `failures` as
 * warnings (not hard blockers — a studio may accept the risk for a
 * deliberately bold design) in the save response.
 */
export function validateThemeContrast(theme: BrandTheme): ContrastValidationResult {
  const background = theme.backgroundColor ?? "#FFFFFF";
  const text = theme.textColor ?? "#14161A";

  const pairs: { pair: string; foreground: string; background: string; requiresAA: boolean }[] = [
    { pair: "body text on background", foreground: text, background, requiresAA: true },
    { pair: "primary color on background", foreground: theme.primaryColor, background, requiresAA: false },
    { pair: "accent color on background", foreground: theme.accentColor, background, requiresAA: false },
  ];

  if (theme.secondaryColor) {
    pairs.push({ pair: "secondary color on background", foreground: theme.secondaryColor, background, requiresAA: false });
  }

  const checks: ContrastCheck[] = pairs.map((p) => {
    const ratio = contrastRatio(p.foreground, p.background);
    const level = contrastLevel(ratio);
    const passes = p.requiresAA ? level === "AA" : level !== "fail";
    return { ...p, ratio: Math.round(ratio * 100) / 100, level, passes };
  });

  const failures = checks.filter((c) => !c.passes);
  return { checks, passes: failures.length === 0, failures };
}
