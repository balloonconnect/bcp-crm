import { describe, expect, it } from "vitest";
import { resolveUnitPrice } from "../pricing";

describe("resolveUnitPrice", () => {
  it("prefers an event-specific override over everything else", () => {
    expect(resolveUnitPrice({ basePriceInPaise: 1000, variantPriceInPaise: 1500, eventOverridePriceInPaise: 800 })).toBe(800);
  });

  it("prefers a variant price over the base price when no override exists", () => {
    expect(resolveUnitPrice({ basePriceInPaise: 1000, variantPriceInPaise: 1500, eventOverridePriceInPaise: null })).toBe(1500);
  });

  it("falls back to the base price when neither a variant nor an override applies", () => {
    expect(resolveUnitPrice({ basePriceInPaise: 1000, variantPriceInPaise: null, eventOverridePriceInPaise: null })).toBe(1000);
  });
});
