const LOW_LIGHT_BRIGHTNESS_THRESHOLD = 40; // Rekognition's Quality.Brightness is 0-100; below this, a retake is worth suggesting

export interface CaptureQualityInput {
  faceCount: number;
  brightness: number | null; // null when the provider couldn't assess quality (e.g. no face detected at all)
}

export interface CaptureQualityResult {
  multipleFacesWarning: boolean;
  lowLightWarning: boolean;
  noFaceDetected: boolean;
}

/**
 * Evaluated on the captured selfie/scan frame *before* a search is
 * attempted — "Multiple-face warning" fires when more than one face is
 * in frame (search would be ambiguous about which face the guest
 * means), "Low-light warning" suggests a retake rather than silently
 * returning poor matches. Both are advisory, not blocking — a guest
 * can proceed anyway; see `@bcp/face-recognition`'s `validation.ts` for
 * where that choice is captured.
 */
export function evaluateCaptureQuality(input: CaptureQualityInput): CaptureQualityResult {
  return {
    noFaceDetected: input.faceCount === 0,
    multipleFacesWarning: input.faceCount > 1,
    lowLightWarning: input.brightness !== null && input.brightness < LOW_LIGHT_BRIGHTNESS_THRESHOLD,
  };
}
