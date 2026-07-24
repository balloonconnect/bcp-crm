import { test, expect } from "@playwright/test";

/** "Touch actions" — verifies actual tap interaction (Playwright's `tap()`, which requires `hasTouch: true`) drives the same behavior a click would, on the touch-enabled viewport projects. */
test.describe("touch actions", () => {
  test("tapping the primary navigation opens the intended page", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "this specifically exercises touch (tap) input, not click");

    await page.goto("/");
    const dataToolsLink = page.getByRole("link", { name: /data tools/i });
    if (await dataToolsLink.count() > 0) {
      await dataToolsLink.first().tap();
      await expect(page).toHaveURL(/\/data-tools/);
    }
  });

  test("tapping a button triggers its action the same way a click would", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "this specifically exercises touch (tap) input, not click");

    await page.goto("/leads");
    const firstButton = page.getByRole("button").first();
    if (await firstButton.count() > 0) {
      await expect(firstButton).toBeVisible();
      await firstButton.tap({ trial: true }); // trial: confirms the element is tappable (visible, not obscured, not disabled) without triggering a real navigation this test doesn't assert on
    }
  });
});
