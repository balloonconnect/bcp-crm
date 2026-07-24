import { describe, expect, it } from "vitest";
import { suggestAlbumSequence, selectCoverPhoto, balanceMomentCategories } from "../sequencing";

describe("suggestAlbumSequence", () => {
  it("orders photos chronologically", () => {
    const photos = [
      { galleryPhotoId: "b", uploadedAt: new Date("2026-07-02") },
      { galleryPhotoId: "a", uploadedAt: new Date("2026-07-01") },
    ];
    expect(suggestAlbumSequence(photos)).toEqual(["a", "b"]);
  });
});

describe("selectCoverPhoto", () => {
  it("prefers a photo featuring an important person", () => {
    const photos = [
      { galleryPhotoId: "detail-shot", qualityScore: 95, subjectProminenceScore: 40, featuresImportantPerson: false },
      { galleryPhotoId: "couple-portrait", qualityScore: 85, subjectProminenceScore: 90, featuresImportantPerson: true },
    ];
    expect(selectCoverPhoto(photos)).toBe("couple-portrait");
  });

  it("returns null for an empty pool", () => {
    expect(selectCoverPhoto([])).toBeNull();
  });
});

describe("balanceMomentCategories", () => {
  it("allocates roughly evenly across categories present", () => {
    const photos = [
      ...Array.from({ length: 10 }, (_, i) => ({ galleryPhotoId: `ceremony-${i}`, momentCategory: "ceremony", qualityScore: 90 - i })),
      ...Array.from({ length: 3 }, (_, i) => ({ galleryPhotoId: `reception-${i}`, momentCategory: "reception", qualityScore: 80 - i })),
    ];
    const selected = balanceMomentCategories(photos, 6);
    const receptionCount = selected.filter((id) => id.startsWith("reception")).length;
    expect(receptionCount).toBeGreaterThan(0);
    expect(selected).toHaveLength(6);
  });

  it("never selects more photos from a category than it actually has", () => {
    const photos = [
      { galleryPhotoId: "only-one", momentCategory: "speeches", qualityScore: 80 },
      ...Array.from({ length: 10 }, (_, i) => ({ galleryPhotoId: `dance-${i}`, momentCategory: "dance", qualityScore: 70 - i })),
    ];
    const selected = balanceMomentCategories(photos, 8);
    expect(selected.filter((id) => id === "only-one")).toHaveLength(1);
    expect(selected).toHaveLength(8);
  });
});
