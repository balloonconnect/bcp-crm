import { describe, expect, it } from "vitest";
import { computeWarningLevel, evaluateUsageWarning, crossedNewThreshold, WARNING_THRESHOLDS } from "../limit-warnings";

describe("WARNING_THRESHOLDS", () => {
  it("is exactly 70, 85, 95, 100 in ascending order", () => {
    expect(WARNING_THRESHOLDS).toEqual([70, 85, 95, 100]);
  });
});

describe("computeWarningLevel", () => {
  it("is ok below 70%", () => {
    expect(computeWarningLevel(0)).toBe("ok");
    expect(computeWarningLevel(69.9)).toBe("ok");
  });

  it("crosses each threshold at its exact value", () => {
    expect(computeWarningLevel(70)).toBe(70);
    expect(computeWarningLevel(85)).toBe(85);
    expect(computeWarningLevel(95)).toBe(95);
    expect(computeWarningLevel(100)).toBe(100);
  });

  it("caps at 100 even above it", () => {
    expect(computeWarningLevel(150)).toBe(100);
  });
});

describe("evaluateUsageWarning", () => {
  it("is always ok for an unlimited (null) limit", () => {
    const result = evaluateUsageWarning(1_000_000, null);
    expect(result.level).toBe("ok");
    expect(result.check.allowed).toBe(true);
  });

  it("computes the correct percentage and level", () => {
    const result = evaluateUsageWarning(70, 100);
    expect(result.percentUsed).toBe(70);
    expect(result.level).toBe(70);
  });

  it("reports exceeded (not allowed) at or past the limit", () => {
    const result = evaluateUsageWarning(100, 100);
    expect(result.level).toBe(100);
    expect(result.check.allowed).toBe(false);
  });
});

describe("crossedNewThreshold", () => {
  it("detects crossing the 70% threshold", () => {
    // limit=100 -> 70% threshold count = 70
    expect(crossedNewThreshold(69, 70, 100)).toBe(70);
  });

  it("returns null when no new threshold was crossed", () => {
    expect(crossedNewThreshold(71, 72, 100)).toBeNull();
  });

  it("returns null for an unlimited limit", () => {
    expect(crossedNewThreshold(1000, 2000, null)).toBeNull();
  });

  it("detects crossing 100% (hitting the limit)", () => {
    expect(crossedNewThreshold(99, 100, 100)).toBe(100);
  });

  it("detects skipping straight past multiple thresholds, returning the first one crossed", () => {
    expect(crossedNewThreshold(50, 100, 100)).toBe(70);
  });
});
