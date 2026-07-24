import { describe, expect, it } from "vitest";
import { EQUIPMENT_CATEGORIES } from "../categories";

describe("EQUIPMENT_CATEGORIES", () => {
  it("has exactly the 15 categories named in the brief", () => {
    expect(EQUIPMENT_CATEGORIES.length).toBe(15);
  });

  it("has unique entries", () => {
    expect(new Set(EQUIPMENT_CATEGORIES).size).toBe(15);
  });

  it("includes Camera and Memory Card", () => {
    expect(EQUIPMENT_CATEGORIES).toContain("Camera");
    expect(EQUIPMENT_CATEGORIES).toContain("Memory Card");
  });
});
