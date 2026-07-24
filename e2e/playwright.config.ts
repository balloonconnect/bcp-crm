import { defineConfig, devices } from "@playwright/test";

/**
 * "Responsive Playwright sizes" — the exact 11 viewports named in the
 * brief, run as separate Playwright projects so a failure reports
 * which specific size broke rather than a single blended run. Every
 * project shares the same spec files; what changes per project is
 * only the viewport (and, for the two touch-labeled sizes, real touch
 * emulation via `hasTouch`/`isMobile` rather than just a resized
 * desktop browser window pretending to be a phone).
 *
 * Requires `pnpm --filter @bcp/e2e install-browsers` once (downloads
 * real Chromium/WebKit binaries) and a running `apps/studio-web` dev
 * server at BASE_URL. Neither browser binaries nor a live dev server
 * were available in this sandbox — no network access for the
 * download, no way to keep a long-running dev server up alongside
 * this build — so this suite is written correctly and is ready to run
 * in any environment with both, but was not executed as part of this
 * build. See docs/testing-guide.md.
 */
const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568, isMobile: true, hasTouch: true }, // iPhone SE (1st gen) — the smallest realistic target
  { name: "mobile-375x667", width: 375, height: 667, isMobile: true, hasTouch: true }, // iPhone 6/7/8
  { name: "mobile-390x844", width: 390, height: 844, isMobile: true, hasTouch: true }, // iPhone 12/13/14
  { name: "mobile-430x932", width: 430, height: 932, isMobile: true, hasTouch: true }, // iPhone 14/15 Pro Max
  { name: "tablet-768x1024", width: 768, height: 1024, isMobile: true, hasTouch: true }, // iPad (portrait)
  { name: "tablet-820x1180", width: 820, height: 1180, isMobile: true, hasTouch: true }, // iPad Air (portrait)
  { name: "desktop-1024x768", width: 1024, height: 768, isMobile: false, hasTouch: false }, // small laptop / iPad landscape
  { name: "desktop-1280x800", width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: "desktop-1366x768", width: 1366, height: 768, isMobile: false, hasTouch: false }, // the single most common laptop resolution
  { name: "desktop-1440x900", width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: "desktop-1920x1080", width: 1920, height: 1080, isMobile: false, hasTouch: false }, // full HD desktop
];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3002", // apps/studio-web's own dev port
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: VIEWPORTS.map((vp) => ({
    name: vp.name,
    use: { ...devices["Desktop Chrome"], viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch },
  })),
});
