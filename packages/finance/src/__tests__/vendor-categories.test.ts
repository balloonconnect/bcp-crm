import { describe, expect, it } from "vitest";
import { VENDOR_CATEGORIES } from "../vendor-categories";

describe("VENDOR_CATEGORIES", () => {
  it("has exactly the 11 categories named in the brief", () => {
    expect(VENDOR_CATEGORIES.length).toBe(11);
  });

  it("has unique entries", () => {
    expect(new Set(VENDOR_CATEGORIES).size).toBe(11);
  });

  it("includes Album Lab and Courier", () => {
    expect(VENDOR_CATEGORIES).toContain("Album Lab");
    expect(VENDOR_CATEGORIES).toContain("Courier");
  });
});
