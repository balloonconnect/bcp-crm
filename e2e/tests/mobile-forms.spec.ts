import { test, expect } from "@playwright/test";

/** "Mobile form usability" — only meaningful on the mobile/tablet-sized projects (a desktop viewport has no minimum touch-target requirement), so every check here explicitly skips itself on a non-touch project rather than asserting something that was never the point on a mouse-driven layout. */
test.describe("mobile form usability", () => {
  test("form inputs meet the ~44px minimum touch-target height on touch viewports", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch-target sizing only matters on touch viewports");

    await page.goto("/leads");
    const inputs = page.locator("input, select, button");
    const count = await inputs.count();
    const tooSmall: string[] = [];

    for (let i = 0; i < Math.min(count, 30); i++) {
      const box = await inputs.nth(i).boundingBox();
      if (box && box.height > 0 && box.height < 40) tooSmall.push(`element ${i}: ${box.height}px tall`);
    }

    expect(tooSmall, `interactive elements under the ~44px touch-target guideline: ${tooSmall.join(", ")}`).toEqual([]);
  });

  test("text inputs use a font-size of at least 16px, so mobile Safari doesn't auto-zoom on focus", async ({ page, isMobile }) => {
    test.skip(!isMobile, "iOS auto-zoom-on-focus is a mobile-Safari-specific behavior");

    await page.goto("/leads");
    const fontSizes = await page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea').evaluateAll((elements) => elements.map((el) => parseFloat(getComputedStyle(el).fontSize)));

    for (const size of fontSizes) expect(size, "a text input under 16px triggers an unwanted auto-zoom on focus in mobile Safari").toBeGreaterThanOrEqual(16);
  });
});
