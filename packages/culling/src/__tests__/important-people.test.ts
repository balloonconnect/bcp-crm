import { describe, expect, it } from "vitest";
import { rankImportantFaces } from "../important-people";

describe("rankImportantFaces", () => {
  it("ranks faces by distinct photo count, descending", () => {
    const occurrences = [
      { providerFaceId: "a", galleryPhotoId: "p1" },
      { providerFaceId: "a", galleryPhotoId: "p2" },
      { providerFaceId: "a", galleryPhotoId: "p3" },
      { providerFaceId: "b", galleryPhotoId: "p1" },
    ];
    const ranked = rankImportantFaces(occurrences);
    expect(ranked[0]).toEqual({ providerFaceId: "a", photoCount: 3 });
    expect(ranked[1]).toEqual({ providerFaceId: "b", photoCount: 1 });
  });

  it("does not double-count the same face appearing twice in one photo", () => {
    const occurrences = [
      { providerFaceId: "a", galleryPhotoId: "p1" },
      { providerFaceId: "a", galleryPhotoId: "p1" },
    ];
    expect(rankImportantFaces(occurrences)[0]!.photoCount).toBe(1);
  });

  it("limits to topN", () => {
    const occurrences = Array.from({ length: 10 }, (_, i) => ({ providerFaceId: `face-${i}`, galleryPhotoId: "p1" }));
    expect(rankImportantFaces(occurrences, 3)).toHaveLength(3);
  });
});
