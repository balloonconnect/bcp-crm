import { describe, expect, it } from "vitest";
import { resolveCullingRecommendation } from "../recommendation";

const evenWeights = { technicalQuality: 0.25, emotionalMoments: 0.25, peopleBalance: 0.25, poseVariety: 0.25 };

describe("resolveCullingRecommendation", () => {
  it("includes a high-quality photo with no issues", () => {
    const result = resolveCullingRecommendation({ qualityScore: 90, technicalIssues: [], isEmotionalMoment: false, isDuplicateNonBest: false, isRepeatedPose: false }, evenWeights);
    expect(result.recommendation).toBe("include");
  });

  it("excludes a low-quality photo with technical issues", () => {
    const result = resolveCullingRecommendation({ qualityScore: 20, technicalIssues: ["blurry", "closed_eyes"], isEmotionalMoment: false, isDuplicateNonBest: false, isRepeatedPose: false }, evenWeights);
    expect(result.recommendation).toBe("exclude");
  });

  it("protects an emotionally significant photo from exclusion despite low quality", () => {
    const result = resolveCullingRecommendation({ qualityScore: 30, technicalIssues: ["blurry"], isEmotionalMoment: true, isDuplicateNonBest: false, isRepeatedPose: false }, evenWeights);
    expect(result.recommendation).not.toBe("exclude");
  });

  it("floors a near-duplicate of an emotional moment at review, never a hard include or exclude", () => {
    const result = resolveCullingRecommendation({ qualityScore: 90, technicalIssues: [], isEmotionalMoment: true, isDuplicateNonBest: true, isRepeatedPose: false }, evenWeights);
    expect(result.recommendation).toBe("review");
  });

  it("penalizes a repeated pose that is not an emotional moment, more likely to push toward review/exclude", () => {
    const borderline = { qualityScore: 68, technicalIssues: [], isEmotionalMoment: false, isDuplicateNonBest: false, isRepeatedPose: false };
    const borderlineRepeated = { ...borderline, isRepeatedPose: true };
    const without = resolveCullingRecommendation(borderline, evenWeights);
    const withRepeat = resolveCullingRecommendation(borderlineRepeated, evenWeights);
    expect(without.recommendation).toBe("include");
    expect(withRepeat.recommendation).not.toBe("include");
  });

  it("always includes a reason", () => {
    const result = resolveCullingRecommendation({ qualityScore: 50, technicalIssues: [], isEmotionalMoment: false, isDuplicateNonBest: false, isRepeatedPose: false }, evenWeights);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("always includes a confidence between 0 and 100", () => {
    const result = resolveCullingRecommendation({ qualityScore: 50, technicalIssues: [], isEmotionalMoment: false, isDuplicateNonBest: false, isRepeatedPose: false }, evenWeights);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});
