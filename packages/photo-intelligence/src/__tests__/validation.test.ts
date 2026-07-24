import { describe, expect, it } from "vitest";
import { reviewActionSchema, bulkReviewSchema, analysisFilterSchema } from "../validation";

describe("reviewActionSchema", () => {
  it("accepts approve/reject", () => {
    expect(reviewActionSchema.safeParse({ action: "approve" }).success).toBe(true);
    expect(reviewActionSchema.safeParse({ action: "maybe" }).success).toBe(false);
  });
});

describe("bulkReviewSchema", () => {
  it("accepts a batch of analysis IDs", () => {
    const result = bulkReviewSchema.safeParse({ photoAnalysisIds: ["00000000-0000-0000-0000-000000000000"], action: "approve" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty batch", () => {
    expect(bulkReviewSchema.safeParse({ photoAnalysisIds: [], action: "approve" }).success).toBe(false);
  });
});

describe("analysisFilterSchema", () => {
  it("accepts a quality-score filter", () => {
    expect(analysisFilterSchema.safeParse({ minQualityScore: "70" }).success).toBe(true);
  });
});
