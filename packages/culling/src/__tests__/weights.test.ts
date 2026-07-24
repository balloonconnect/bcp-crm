import { describe, expect, it } from "vitest";
import { normalizeWeights, mergeWeights } from "../weights";

describe("normalizeWeights", () => {
  it("normalizes weights to sum to 1", () => {
    const result = normalizeWeights({ technicalQuality: 2, emotionalMoments: 2, peopleBalance: 2, poseVariety: 2 });
    expect(result.technicalQuality).toBeCloseTo(0.25);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("falls back to an even split when all weights are zero", () => {
    const result = normalizeWeights({ technicalQuality: 0, emotionalMoments: 0, peopleBalance: 0, poseVariety: 0 });
    expect(result.technicalQuality).toBeCloseTo(0.25);
  });

  it("clamps negative weights to zero before normalizing", () => {
    const result = normalizeWeights({ technicalQuality: -5, emotionalMoments: 5, peopleBalance: 0, poseVariety: 0 });
    expect(result.technicalQuality).toBe(0);
    expect(result.emotionalMoments).toBeCloseTo(1);
  });
});

describe("mergeWeights", () => {
  it("overrides only the specified keys and renormalizes", () => {
    const base = { technicalQuality: 0.25, emotionalMoments: 0.25, peopleBalance: 0.25, poseVariety: 0.25 };
    const result = mergeWeights(base, { emotionalMoments: 0.7 });
    expect(result.emotionalMoments).toBeGreaterThan(result.technicalQuality);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});
