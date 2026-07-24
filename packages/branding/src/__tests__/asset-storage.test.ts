import { describe, expect, it } from "vitest";
import { validateBrandAsset, brandAssetStorageKey, extensionForMimeType } from "../asset-storage";

describe("validateBrandAsset", () => {
  it("accepts a valid logo", () => {
    expect(validateBrandAsset({ kind: "logo", mimeType: "image/png", sizeBytes: 100_000 })).toEqual({ ok: true });
  });

  it("rejects an oversized favicon", () => {
    const result = validateBrandAsset({ kind: "favicon", mimeType: "image/png", sizeBytes: 10_000_000 });
    expect(result).toEqual({ ok: false, reason: "file_too_large" });
  });

  it("rejects an unsupported mime type for a watermark", () => {
    const result = validateBrandAsset({ kind: "watermark", mimeType: "image/jpeg", sizeBytes: 1000 });
    expect(result).toEqual({ ok: false, reason: "unsupported_type" });
  });

  it("allows a larger login background than a logo", () => {
    const result = validateBrandAsset({ kind: "login_background", mimeType: "image/jpeg", sizeBytes: 5_000_000 });
    expect(result).toEqual({ ok: true });
  });
});

describe("brandAssetStorageKey", () => {
  it("namespaces by studio and asset kind", () => {
    const key = brandAssetStorageKey("studio-1", "logo", "png");
    expect(key).toMatch(/^branding\/studio-1\/logo\/\d+\.png$/);
  });

  it("strips a leading dot from the extension", () => {
    const key = brandAssetStorageKey("studio-1", "favicon", ".ico");
    expect(key).toMatch(/\.ico$/);
    expect(key).not.toMatch(/\.\.ico$/);
  });
});

describe("extensionForMimeType", () => {
  it("maps known mime types", () => {
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/svg+xml")).toBe("svg");
  });

  it("falls back to 'bin' for unknown types", () => {
    expect(extensionForMimeType("application/octet-stream")).toBe("bin");
  });
});
