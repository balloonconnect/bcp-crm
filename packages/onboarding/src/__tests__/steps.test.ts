import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, TOTAL_STEPS, getStepDefinition, getStepByOrder, REQUIRED_STEP_KEYS } from "../steps";

describe("ONBOARDING_STEPS", () => {
  it("has exactly 20 steps", () => {
    expect(TOTAL_STEPS).toBe(20);
    expect(ONBOARDING_STEPS.length).toBe(20);
  });

  it("has unique, sequential order values from 1 to 20", () => {
    const orders = ONBOARDING_STEPS.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("has unique step keys", () => {
    const keys = ONBOARDING_STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("starts with owner_account and ends with final_review", () => {
    expect(getStepByOrder(1)?.key).toBe("owner_account");
    expect(getStepByOrder(20)?.key).toBe("final_review");
  });

  it("marks the expected steps as required", () => {
    expect(REQUIRED_STEP_KEYS.sort()).toEqual(
      ["owner_account", "studio_name", "branch", "subscription", "final_review"].sort(),
    );
  });

  it("throws for an unknown step key", () => {
    // @ts-expect-error deliberately invalid
    expect(() => getStepDefinition("not_a_step")).toThrow();
  });
});
