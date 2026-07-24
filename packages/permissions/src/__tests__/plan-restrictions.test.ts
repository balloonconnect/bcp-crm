import { describe, expect, it } from "vitest";
import { checkPlanLimit, assertWithinPlanLimit, PlanLimitExceededError } from "../plan-restrictions";

describe("checkPlanLimit", () => {
  it("treats a null limit as unlimited", () => {
    const result = checkPlanLimit(1000, null);
    expect(result).toEqual({ allowed: true, limit: null, current: 1000, remaining: null });
  });

  it("allows when current is below the limit", () => {
    const result = checkPlanLimit(3, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);
  });

  it("disallows when current has reached the limit", () => {
    const result = checkPlanLimit(10, 10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("assertWithinPlanLimit", () => {
  it("throws PlanLimitExceededError when over the limit", () => {
    expect(() => assertWithinPlanLimit("branches", checkPlanLimit(3, 3))).toThrow(
      PlanLimitExceededError,
    );
  });

  it("does not throw when within the limit", () => {
    expect(() => assertWithinPlanLimit("branches", checkPlanLimit(2, 3))).not.toThrow();
  });
});
