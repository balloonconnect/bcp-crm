import { hexToHslTriplet, readableForegroundFor } from "./colors";
import type { BrandTheme } from "./theme-schema";

const BUTTON_RADIUS_SCALE: Record<BrandTheme["buttonStyle"], number> = {
  solid: 1,
  outline: 1,
  ghost: 1,
  pill: 999, // effectively fully rounded regardless of the base radius
};

/**
 * Produces the same CSS custom property names @bcp/ui's design system
 * reads (`--primary`, `--accent`, `--background`, `--foreground`,
 * `--radius`, `--font-sans`, `--font-display` — see
 * packages/ui/src/styles/globals.css) plus a handful of branding-only
 * extras (`--brand-secondary`, `--brand-watermark-opacity`, …). Every
 * *-foreground pair is computed automatically via `readableForegroundFor`
 * unless the theme doesn't define the base color, so buttons/badges never
 * render illegibly even if a studio only sets one side of a color pair.
 */
export function themeToCssVariables(theme: BrandTheme): Record<string, string> {
  const background = theme.backgroundColor ?? "#FFFFFF";
  const text = theme.textColor ?? "#14161A";

  const vars: Record<string, string> = {
    "--background": hexToHslTriplet(background),
    "--foreground": hexToHslTriplet(text),
    "--primary": hexToHslTriplet(theme.primaryColor),
    "--primary-foreground": hexToHslTriplet(readableForegroundFor(theme.primaryColor)),
    "--accent": hexToHslTriplet(theme.accentColor),
    "--accent-foreground": hexToHslTriplet(readableForegroundFor(theme.accentColor)),
    "--brand": hexToHslTriplet(theme.accentColor),
    "--brand-foreground": hexToHslTriplet(readableForegroundFor(theme.accentColor)),
    "--radius": `${theme.borderRadius}px`,
    "--font-sans": theme.fontFamilyBody ?? "Inter",
    "--font-display": theme.fontFamilyHeading ?? theme.fontFamilyBody ?? "Inter",
    "--brand-button-radius-scale": String(BUTTON_RADIUS_SCALE[theme.buttonStyle]),
    "--brand-card-style": theme.cardStyle,
    "--brand-watermark-opacity": String(theme.watermarkOpacity),
  };

  if (theme.secondaryColor) {
    vars["--secondary"] = hexToHslTriplet(theme.secondaryColor);
    vars["--secondary-foreground"] = hexToHslTriplet(readableForegroundFor(theme.secondaryColor));
    vars["--brand-secondary"] = hexToHslTriplet(theme.secondaryColor);
  }

  return vars;
}

/** Renders CSS variables as a `:root { ... }` block, e.g. for a `<style>` tag or an emailed inline style. */
export function cssVariablesToRootBlock(vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

/** Renders CSS variables as an inline `style="--x: y; --z: w"` attribute value, for contexts (like email) that can't load a stylesheet. */
export function cssVariablesToInlineStyle(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
