import { describe, expect, it } from "vitest";
import { resolvePhotoVariant } from "../variant";

const photo = { fileKey: "original.jpg", compressedKey: "compressed.jpg", thumbnailKey: "thumb.jpg", watermarkedKey: "watermarked.jpg" };

describe("resolvePhotoVariant", () => {
  it("always gives a studio user the true original for viewing", () => {
    expect(resolvePhotoVariant(photo, "studio_user", true, "view")).toBe("original.jpg");
  });

  it("gives a guest the watermarked variant when watermarking is on", () => {
    expect(resolvePhotoVariant(photo, "guest", true, "view")).toBe("watermarked.jpg");
  });

  it("falls back to compressed for a guest viewing when watermarking is off", () => {
    expect(resolvePhotoVariant(photo, "guest", false, "view")).toBe("compressed.jpg");
  });

  it("gives a guest the true original when they download the original", () => {
    expect(resolvePhotoVariant(photo, "guest", true, "download_original")).toBe("original.jpg");
  });

  it("falls back to the raw file when no derived variant exists", () => {
    const bare = { fileKey: "only.jpg", compressedKey: null, thumbnailKey: null, watermarkedKey: null };
    expect(resolvePhotoVariant(bare, "guest", true, "view")).toBe("only.jpg");
  });
});
