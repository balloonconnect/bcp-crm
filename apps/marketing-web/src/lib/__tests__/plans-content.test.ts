import { describe, expect, it } from "vitest";
import { PLAN_HIGHLIGHTS, COMPARISON_ROWS, PUBLIC_PLAN_KEYS, formatRupees, formatLimit } from "../plans-content";

describe("PUBLIC_PLAN_KEYS", () => {
  it("shows 4 public plans and omits the internal 'custom' tier", () => {
    expect(PUBLIC_PLAN_KEYS).toEqual(["starter", "professional", "business", "enterprise"]);
    expect(PUBLIC_PLAN_KEYS).not.toContain("custom");
  });
});

describe("PLAN_HIGHLIGHTS", () => {
  it("has one highlight per public plan", () => {
    expect(PLAN_HIGHLIGHTS.length).toBe(PUBLIC_PLAN_KEYS.length);
  });

  it("marks exactly one plan as featured", () => {
    expect(PLAN_HIGHLIGHTS.filter((p) => p.featured).length).toBe(1);
  });

  it("shows 'Contact us' for negotiated (zero-price) plans", () => {
    const enterprise = PLAN_HIGHLIGHTS.find((p) => p.key === "enterprise")!;
    expect(enterprise.priceMonthlyLabel).toBe("Contact us");
  });

  it("shows a rupee price for the Starter plan", () => {
    const starter = PLAN_HIGHLIGHTS.find((p) => p.key === "starter")!;
    expect(starter.priceMonthlyLabel).toMatch(/^₹[\d,]+\/mo$/);
  });
});

describe("COMPARISON_ROWS", () => {
  it("every row resolves a value for every public plan", () => {
    for (const row of COMPARISON_ROWS) {
      for (const key of PUBLIC_PLAN_KEYS) {
        expect(row.get(key).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("formatRupees / formatLimit", () => {
  it("formats paise as a rupee string with grouping", () => {
    expect(formatRupees(99900)).toBe("₹999");
    expect(formatRupees(249900)).toBe("₹2,499");
  });

  it("formats null as Unlimited", () => {
    expect(formatLimit(null)).toBe("Unlimited");
    expect(formatLimit(50)).toBe("50");
  });
});
