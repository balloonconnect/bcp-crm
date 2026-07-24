import type { Preview, Decorator } from "@storybook/react";
import React from "react";
import "../src/styles/globals.css";

/**
 * Viewport presets named after the exact breakpoint tiers from the design
 * spec, so switching devices in the Storybook toolbar directly exercises
 * each documented range rather than generic "mobile/tablet/desktop" guesses.
 */
const breakpointViewports = {
  smallMobile: {
    name: "Small mobile (320–374px)",
    styles: { width: "360px", height: "740px" },
    type: "mobile" as const,
  },
  standardMobile: {
    name: "Standard mobile (375–639px)",
    styles: { width: "390px", height: "844px" },
    type: "mobile" as const,
  },
  tabletPortrait: {
    name: "Tablet portrait (640–767px)",
    styles: { width: "700px", height: "1000px" },
    type: "tablet" as const,
  },
  tabletLandscape: {
    name: "Tablet landscape (768–1023px)",
    styles: { width: "1000px", height: "760px" },
    type: "tablet" as const,
  },
  desktop: {
    name: "Desktop (1024–1439px)",
    styles: { width: "1280px", height: "800px" },
    type: "desktop" as const,
  },
  largeDesktop: {
    name: "Large desktop (1440px+)",
    styles: { width: "1600px", height: "900px" },
    type: "desktop" as const,
  },
};

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";
  const reducedMotion = context.globals.reducedMotion === "on";

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.setProperty(
      "--storybook-motion-override",
      reducedMotion ? "reduce" : "no-preference",
    );
  }, [theme, reducedMotion]);

  return React.createElement(
    "div",
    { className: theme === "dark" ? "dark" : "", "data-reduced-motion": reducedMotion },
    React.createElement(
      "div",
      { className: "min-h-[100px] bg-background text-foreground" },
      React.createElement(Story),
    ),
  );
};

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true }, // theme decorator drives background via CSS tokens instead
    viewport: { viewports: breakpointViewports },
    a11y: {
      // Fail CI-run Storybook tests on WCAG 2 AA violations; see docs/accessibility.md.
      config: { rules: [] },
      options: { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag22aa"] } },
    },
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      description: "Light / dark theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    reducedMotion: {
      description: "Simulate prefers-reduced-motion",
      defaultValue: "off",
      toolbar: {
        title: "Reduced motion",
        icon: "accessibility",
        items: [
          { value: "off", title: "Motion: on" },
          { value: "on", title: "Motion: reduced" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
