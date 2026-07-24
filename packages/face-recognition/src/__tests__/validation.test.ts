import { describe, expect, it } from "vitest";
import { consentInputSchema, startFaceSearchSchema, gallerySettingsInputSchema } from "../validation";

describe("consentInputSchema", () => {
  it("requires non-empty consent text", () => {
    expect(consentInputSchema.safeParse({ consentText: "I agree to a face search of my selfie against this gallery's photos." }).success).toBe(true);
    expect(consentInputSchema.safeParse({ consentText: "" }).success).toBe(false);
  });
});

describe("startFaceSearchSchema", () => {
  it("accepts a live scan request", () => {
    expect(startFaceSearchSchema.safeParse({ mode: "live_scan" }).success).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(startFaceSearchSchema.safeParse({ mode: "video_call" }).success).toBe(false);
  });
});

describe("gallerySettingsInputSchema", () => {
  it("accepts a confidence threshold within 0-100", () => {
    expect(gallerySettingsInputSchema.safeParse({ faceSearchConfidenceThreshold: 85 }).success).toBe(true);
    expect(gallerySettingsInputSchema.safeParse({ faceSearchConfidenceThreshold: 150 }).success).toBe(false);
  });
});
