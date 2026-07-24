import { describe, expect, it } from "vitest";
import { GALLERY_LAYOUTS, groupPhotosByDay } from "../layouts";

describe("GALLERY_LAYOUTS", () => {
  it("has exactly the 5 layouts named in the brief", () => {
    expect(GALLERY_LAYOUTS.map((l) => l.key)).toEqual(["grid", "masonry", "story", "timeline", "highlights"]);
  });
});

describe("groupPhotosByDay", () => {
  it("groups photos into calendar-day buckets in chronological order", () => {
    const photos = [
      { id: "a", uploadedAt: new Date("2026-07-02T10:00:00Z"), order: 0 },
      { id: "b", uploadedAt: new Date("2026-07-01T09:00:00Z"), order: 0 },
      { id: "c", uploadedAt: new Date("2026-07-01T15:00:00Z"), order: 0 },
    ];
    const groups = groupPhotosByDay(photos);
    expect(groups.map((g) => g.dateKey)).toEqual(["2026-07-01", "2026-07-02"]);
    expect(groups[0]!.photos.map((p) => p.id)).toEqual(["b", "c"]);
  });
});
