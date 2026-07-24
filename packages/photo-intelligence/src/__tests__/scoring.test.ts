import { describe, expect, it } from "vitest";
import { computeSharpnessScore, deriveIsBlurry, computeNoiseScore, evaluateExposure, computeQualityScore } from "../scoring";

describe("computeSharpnessScore", () => {
  it("maps a high Laplacian variance to a high score", () => {
    expect(computeSharpnessScore(1500)).toBe(100);
  });

  it("maps a low variance to a low score", () => {
    expect(computeSharpnessScore(75)).toBe(5);
  });

  it("clamps above the ceiling to 100", () => {
    expect(computeSharpnessScore(5000)).toBe(100);
  });
});

describe("deriveIsBlurry", () => {
  it("flags a low sharpness score as blurry", () => {
    expect(deriveIsBlurry(20)).toBe(true);
  });

  it("does not flag a high sharpness score as blurry", () => {
    expect(deriveIsBlurry(80)).toBe(false);
  });
});

describe("computeNoiseScore", () => {
  it("maps low stddev to a low noise score", () => {
    expect(computeNoiseScore(6)).toBe(10);
  });

  it("clamps a very high stddev to 100", () => {
    expect(computeNoiseScore(200)).toBe(100);
  });
});

describe("evaluateExposure", () => {
  it("rates ideal mid-gray luminance as good with a high score", () => {
    const result = evaluateExposure(128);
    expect(result.assessment).toBe("good");
    expect(result.exposureScore).toBe(100);
  });

  it("flags a dark image as underexposed", () => {
    expect(evaluateExposure(30).assessment).toBe("underexposed");
  });

  it("flags a bright image as overexposed", () => {
    expect(evaluateExposure(220).assessment).toBe("overexposed");
  });
});

describe("computeQualityScore", () => {
  it("weights technical and semantic measures equally", () => {
    const perfect = computeQualityScore({ sharpnessScore: 100, exposureScore: 100, noiseScore: 0, compositionScore: 100, subjectProminenceScore: 100 });
    expect(perfect).toBe(100);
  });

  it("penalizes high noise in the composite", () => {
    const noisy = computeQualityScore({ sharpnessScore: 100, exposureScore: 100, noiseScore: 100, compositionScore: 100, subjectProminenceScore: 100 });
    expect(noisy).toBeLessThan(100);
  });
});
