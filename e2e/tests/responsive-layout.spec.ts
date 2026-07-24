import { test, expect } from "@playwright/test";

/**
 * "No clipped content" + "No unexpected page scrolling" — run
 * identically across every one of the 11 configured viewport
 * projects (Playwright runs this same file once per project defined
 * in playwright.config.ts). Checks the dashboard shell and one
 * data-heavy page (leads), since those are the two layouts most
 * likely to break first at a small viewport.
 */
test.describe("responsive layout", () => {
  test("the dashboard has no unexpected horizontal page scroll", async ({ page }) => {
    await page.goto("/");
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow, "the page's own scrollWidth should never exceed its clientWidth — any horizontal scroll should be intentional (inside a bounded table), not page-wide").toBe(false);
  });

  test("no element extends past the right edge of the viewport (clipped content)", async ({ page, viewport }) => {
    await page.goto("/");
    const overflowingElements = await page.evaluate((viewportWidth) => {
      const all = Array.from(document.querySelectorAll("body *"));
      return all
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.right > viewportWidth + 1; // +1px tolerance for sub-pixel rounding
        })
        .map((el) => el.tagName + (el.className ? `.${String(el.className).split(" ")[0]}` : ""))
        .slice(0, 10);
    }, viewport!.width);

    expect(overflowingElements, `elements extending past the viewport's right edge: ${overflowingElements.join(", ")}`).toEqual([]);
  });

  test("a data-heavy list page (leads) also has no page-level horizontal overflow", async ({ page }) => {
    await page.goto("/leads");
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
  });
});
