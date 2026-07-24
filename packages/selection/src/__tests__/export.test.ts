import { describe, expect, it } from "vitest";
import { buildExportFilenameList, buildSelectionCsv } from "../export";

const photos = [
  { galleryPhotoId: "p1", originalFileName: "IMG_0001.jpg", isFavorite: true, comment: "Love this one" },
  { galleryPhotoId: "p2", originalFileName: "IMG_0045.jpg", isFavorite: false, comment: null },
];

describe("buildExportFilenameList", () => {
  it("numbers filenames in selection order", () => {
    expect(buildExportFilenameList(photos)).toEqual(["1. IMG_0001.jpg", "2. IMG_0045.jpg"]);
  });
});

describe("buildSelectionCsv", () => {
  it("includes a header row and one row per photo", () => {
    const csv = buildSelectionCsv(photos);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Sequence,Filename,Favorite,Comment");
    expect(lines).toHaveLength(3);
  });

  it("quotes and escapes a comment containing a comma", () => {
    const csv = buildSelectionCsv([{ galleryPhotoId: "p1", originalFileName: "a.jpg", isFavorite: false, comment: 'Great, "amazing" shot' }]);
    expect(csv).toContain('"Great, ""amazing"" shot"');
  });
});
