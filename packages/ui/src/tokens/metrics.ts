/**
 * Non-color design tokens. Color lives in CSS custom properties (see
 * src/styles/globals.css) so tenants can white-label via @bcp/branding —
 * these are the values that stay constant regardless of brand.
 */

/** WCAG 2.5.5 / 2.5.8 target size — every interactive control meets this. */
export const MIN_TOUCH_TARGET = 44;

/** Fixed chrome heights, kept as tokens so layout math stays in one place. */
export const layoutMetrics = {
  desktopSidebarExpandedWidth: 264,
  desktopSidebarCollapsedWidth: 72,
  desktopHeaderHeight: 64,
  tabletSidebarWidth: 80,
  mobileHeaderHeight: 56,
  mobileBottomNavHeight: 64,
  stickyActionBarHeight: 72,
} as const;

/** Motion durations, in ms. Consumers should pair these with useReducedMotion(). */
export const motion = {
  instant: 0,
  fast: 120,
  base: 200,
  slow: 320,
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    decelerate: "cubic-bezier(0, 0, 0, 1)",
    accelerate: "cubic-bezier(0.3, 0, 1, 1)",
  },
} as const;

/** z-index scale so overlapping chrome (drawers, dialogs, toasts) never guesses. */
export const zIndex = {
  stickyChrome: 30,
  dropdown: 40,
  drawer: 50,
  dialog: 60,
  bottomSheet: 60,
  toast: 70,
} as const;
