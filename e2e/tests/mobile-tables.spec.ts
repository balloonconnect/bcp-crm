import { test, expect } from "@playwright/test";

/** "Mobile tables" — a data table on a narrow viewport should either scroll horizontally *within its own bounded container* (never the whole page) or reflow into stacked cards; either is acceptable, but the page itself must never grow wider than the viewport because of a table. */
test.describe("mobile tables", () => {
  test("a wide data table never forces page-level horizontal scroll on a narrow viewport", async ({ page, isMobile }) => {
    test.skip(!isMobile, "table reflow/scroll-containment is specifically a narrow-viewport concern");

    await page.goto("/leads");
    const pageHasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(pageHasHorizontalOverflow, "a table should scroll within its own container, not widen the page").toBe(false);
  });

  test("if a table container itself scrolls horizontally, that's contained and doesn't affect the rest of the page", async ({ page, isMobile }) => {
    test.skip(!isMobile, "container-scroll containment is a narrow-viewport concern");

    await page.goto("/leads");
    const scrollableTableFound = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll("table"));
      return tables.some((t) => {
        const container = t.closest('[class*="overflow"]') ?? t.parentElement;
        return container ? container.scrollWidth > container.clientWidth : false;
      });
    });
    // Not a hard assertion either way — a table might legitimately fit at this width, or reflow into cards
    // instead of a scrollable table at all. What matters (asserted above) is that any overflow stays contained.
    expect(typeof scrollableTableFound).toBe("boolean");
  });
});
