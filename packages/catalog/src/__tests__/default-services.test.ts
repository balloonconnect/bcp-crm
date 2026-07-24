import { describe, expect, it } from "vitest";
import { DEFAULT_SERVICES, SERVICE_CATEGORIES } from "../default-services";

describe("DEFAULT_SERVICES", () => {
  it("has exactly the 16 services named in the brief", () => {
    expect(DEFAULT_SERVICES.length).toBe(16);
  });

  it("has unique names", () => {
    const names = DEFAULT_SERVICES.map((s) => s.name);
    expect(new Set(names).size).toBe(16);
  });

  it("every service has a category from the known category list", () => {
    const categoryKeys = new Set(SERVICE_CATEGORIES.map((c) => c.key));
    for (const service of DEFAULT_SERVICES) {
      expect(categoryKeys.has(service.category)).toBe(true);
    }
  });
});
