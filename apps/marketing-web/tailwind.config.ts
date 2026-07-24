import type { Config } from "tailwindcss";
import preset from "@bcp/config/tailwind";

/**
 * The marketing site intentionally does NOT use the product's tenant-
 * brandable CSS-variable palette (packages/branding) — there's no tenant
 * here, just BCP Studio OS's own identity. Instead it layers a fixed
 * "darkroom / contact sheet" palette on top of the shared preset (which
 * still supplies spacing, breakpoints, and type scale). See
 * docs/design-system.md for the full rationale.
 */
const config: Config = {
  presets: [preset as Config],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1917", // darkroom background
        charcoal: "#292524", // panel/card bg on dark sections
        paper: "#F7F3EC", // contact-sheet paper — light section background
        "paper-dim": "#EDE7DA", // subtly recessed paper panel
        safelight: "#E8A33D", // the one warm accent — darkroom safelight amber
        "safelight-dim": "#B97F27",
        "ink-soft": "#78716C", // muted warm gray, secondary text on paper
        "ink-faint": "#A8A29E",
        signal: "#2DD4BF", // small "live" indicator only — WhatsApp-style online dot
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Iowan Old Style", "Palatino Linotype", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        sprockets:
          "repeating-linear-gradient(to bottom, transparent, transparent 18px, currentColor 18px, currentColor 22px)",
      },
    },
  },
};

export default config;
