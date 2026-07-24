import { describe, expect, it } from "vitest";
import { PLATFORM_DEFAULT_THEME } from "../platform-default";
import { wrapEmailWithBrand } from "../apply/email";
import { resolveInvoiceDesign, resolveReceiptDesign } from "../apply/invoice";
import { resolveWatermarkConfig } from "../apply/watermark";
import { resolveGalleryTheme, resolveAlbumViewerTheme } from "../apply/gallery";
import { resolveClientPortalTheme } from "../apply/client-portal";
import { resolvePublicFormTheme } from "../apply/public-form";

describe("wrapEmailWithBrand", () => {
  it("includes the body html and the studio's display name", () => {
    const html = wrapEmailWithBrand({ ...PLATFORM_DEFAULT_THEME, displayName: "Balloon Connect" }, "<p>Hello</p>");
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("Balloon Connect");
  });

  it("shows the powered-by line only when poweredByVisible is true", () => {
    const shown = wrapEmailWithBrand({ ...PLATFORM_DEFAULT_THEME, poweredByVisible: true }, "<p>x</p>");
    const hidden = wrapEmailWithBrand({ ...PLATFORM_DEFAULT_THEME, poweredByVisible: false }, "<p>x</p>");
    expect(shown).toContain("Powered by BCP Studio OS");
    expect(hidden).not.toContain("Powered by BCP Studio OS");
  });
});

describe("resolveInvoiceDesign / resolveReceiptDesign", () => {
  it("falls back to the theme accent color with no override", () => {
    const design = resolveInvoiceDesign(PLATFORM_DEFAULT_THEME);
    expect(design.accentColor).toBe(PLATFORM_DEFAULT_THEME.accentColor);
  });

  it("uses the invoice-specific accent override when set", () => {
    const design = resolveInvoiceDesign({ ...PLATFORM_DEFAULT_THEME, invoiceDesign: { accentColorOverride: "#000000" } });
    expect(design.accentColor).toBe("#000000");
  });

  it("receipts resolve identically to invoices", () => {
    expect(resolveReceiptDesign).toBe(resolveInvoiceDesign);
  });
});

describe("resolveWatermarkConfig", () => {
  it("is disabled when no watermarkUrl is set", () => {
    expect(resolveWatermarkConfig(PLATFORM_DEFAULT_THEME).enabled).toBe(false);
  });

  it("is enabled when watermarkUrl is set", () => {
    const config = resolveWatermarkConfig({ ...PLATFORM_DEFAULT_THEME, watermarkUrl: "https://example.com/w.png" });
    expect(config.enabled).toBe(true);
    expect(config.url).toBe("https://example.com/w.png");
  });
});

describe("resolveGalleryTheme / resolveAlbumViewerTheme", () => {
  it("applies gallery-specific overrides on top of the base theme", () => {
    const theme = resolveGalleryTheme({ ...PLATFORM_DEFAULT_THEME, galleryTheme: { backgroundColor: "#000000" } });
    expect(theme.backgroundColor).toBe("#000000");
    expect(theme.primaryColor).toBe(PLATFORM_DEFAULT_THEME.primaryColor);
  });

  it("album viewer shares the gallery resolution function", () => {
    expect(resolveAlbumViewerTheme).toBe(resolveGalleryTheme);
  });
});

describe("resolveClientPortalTheme", () => {
  it("applies client-portal-specific overrides", () => {
    const theme = resolveClientPortalTheme({ ...PLATFORM_DEFAULT_THEME, clientPortalTheme: { accentColor: "#123456" } });
    expect(theme.accentColor).toBe("#123456");
  });
});

describe("resolvePublicFormTheme", () => {
  it("excludes internal-only fields like invoiceDesign", () => {
    const publicTheme = resolvePublicFormTheme({
      ...PLATFORM_DEFAULT_THEME,
      invoiceDesign: { footerNote: "internal only" },
    });
    expect(publicTheme).not.toHaveProperty("invoiceDesign");
  });

  it("carries over the identity and color tokens", () => {
    const publicTheme = resolvePublicFormTheme({ ...PLATFORM_DEFAULT_THEME, displayName: "Studio X" });
    expect(publicTheme.displayName).toBe("Studio X");
    expect(publicTheme.primaryColor).toBe(PLATFORM_DEFAULT_THEME.primaryColor);
  });
});
