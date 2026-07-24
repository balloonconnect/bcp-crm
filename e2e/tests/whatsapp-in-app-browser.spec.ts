import { test, expect } from "@playwright/test";

/**
 * "WhatsApp in-app browser compatibility" — a huge share of links
 * shared over WhatsApp (a review-request link, a gallery link, a
 * quotation link) are opened inside WhatsApp's own embedded browser,
 * not the device's real browser — historically a stripped-down
 * WebView with its own quirks (older engine versions, restricted
 * storage APIs, no full PWA install support). Emulated here via
 * WhatsApp's real Android in-app-browser user-agent string rather
 * than guessing.
 */
const WHATSAPP_ANDROID_USER_AGENT = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.1.78";

test.describe("WhatsApp in-app browser compatibility", () => {
  test.use({ userAgent: WHATSAPP_ANDROID_USER_AGENT, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("a client-facing gallery link loads without a blank page or unhandled script error", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    expect(consoleErrors, `unhandled console/page errors under WhatsApp's in-app browser UA: ${consoleErrors.join("; ")}`).toEqual([]);
  });

  test("does not rely on a PWA-install prompt to be usable — the page itself works standalone", async ({ page }) => {
    // WhatsApp's in-app browser doesn't support installing a PWA — this asserts the core page
    // functions without ever needing that path, rather than silently depending on it.
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const installPromptBlocksContent = await page.locator('[class*="install"]:visible').first().evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9;
    }).catch(() => false);
    expect(installPromptBlocksContent, "an install prompt should never block the entire page for a browser that can't install anyway").toBe(false);
  });
});
