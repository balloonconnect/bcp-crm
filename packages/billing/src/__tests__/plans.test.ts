import { describe, expect, it } from "vitest";
import { PLAN_DEFINITIONS, PLAN_KEYS } from "../plans";
import { planLimitsSchema } from "../plan-limits";

describe("PLAN_DEFINITIONS", () => {
  it("defines exactly the 5 required plans", () => {
    expect(Object.keys(PLAN_DEFINITIONS).sort()).toEqual(
      ["starter", "professional", "business", "enterprise", "custom"].sort(),
    );
    expect(PLAN_KEYS.sort()).toEqual(["starter", "professional", "business", "enterprise", "custom"].sort());
  });

  it("every plan's limits satisfy the schema", () => {
    for (const [key, plan] of Object.entries(PLAN_DEFINITIONS)) {
      const result = planLimitsSchema.safeParse(plan.limits);
      expect(result.success, `${key} limits should be valid`).toBe(true);
    }
  });

  it("limits increase (or stay unlimited) from starter through business", () => {
    const { starter, professional, business } = PLAN_DEFINITIONS;
    expect(professional.limits.maxUsers!).toBeGreaterThan(starter.limits.maxUsers!);
    expect(business.limits.maxUsers!).toBeGreaterThan(professional.limits.maxUsers!);
  });

  it("enterprise and custom plans are unlimited across every numeric dimension", () => {
    for (const key of ["enterprise", "custom"] as const) {
      const limits = PLAN_DEFINITIONS[key].limits;
      expect(limits.maxUsers).toBeNull();
      expect(limits.maxStorageGb).toBeNull();
      expect(limits.whiteLabelAccess).toBe(true);
      expect(limits.apiAccess).toBe(true);
    }
  });

  it("starter plan has no white-label or API access", () => {
    expect(PLAN_DEFINITIONS.starter.limits.whiteLabelAccess).toBe(false);
    expect(PLAN_DEFINITIONS.starter.limits.apiAccess).toBe(false);
  });
});
