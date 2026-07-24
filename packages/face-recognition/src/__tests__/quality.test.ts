import { describe, expect, it } from "vitest";
import { evaluateCaptureQuality } from "../quality";

describe("evaluateCaptureQuality", () => {
  it("flags no face detected", () => {
    expect(evaluateCaptureQuality({ faceCount: 0, brightness: null }).noFaceDetected).toBe(true);
  });

  it("flags multiple faces", () => {
    expect(evaluateCaptureQuality({ faceCount: 3, brightness: 80 }).multipleFacesWarning).toBe(true);
  });

  it("does not flag multiple faces for exactly one", () => {
    expect(evaluateCaptureQuality({ faceCount: 1, brightness: 80 }).multipleFacesWarning).toBe(false);
  });

  it("flags low light below the brightness threshold", () => {
    expect(evaluateCaptureQuality({ faceCount: 1, brightness: 20 }).lowLightWarning).toBe(true);
  });

  it("does not flag low light for a well-lit capture", () => {
    expect(evaluateCaptureQuality({ faceCount: 1, brightness: 80 }).lowLightWarning).toBe(false);
  });

  it("does not flag low light when brightness couldn't be assessed", () => {
    expect(evaluateCaptureQuality({ faceCount: 0, brightness: null }).lowLightWarning).toBe(false);
  });
});
