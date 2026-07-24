/**
 * Converts raw pixel statistics (computed server-side via `sharp` —
 * this package stays free of image-processing dependencies, the same
 * "pure logic only" boundary every other domain package in this
 * codebase holds) into the 0–100 scores and assessments the brief
 * names. The stats themselves — Laplacian variance for sharpness, RGB
 * channel standard deviation for noise, mean luminance for exposure —
 * are standard, well-established computer-vision measures; what's
 * pure and testable here is only the *mapping* from those raw numbers
 * to a score a studio can act on.
 */

const BLUR_VARIANCE_CEILING = 1500; // Laplacian variance at/above this maps to a perfect sharpness score — tuned for typical delivered-resolution JPEGs, not RAW
const BLURRY_THRESHOLD = 35; // sharpness score below this is flagged blurry

export function computeSharpnessScore(laplacianVariance: number): number {
  return Math.max(0, Math.min(100, Math.round((laplacianVariance / BLUR_VARIANCE_CEILING) * 100)));
}

export function deriveIsBlurry(sharpnessScore: number): boolean {
  return sharpnessScore < BLURRY_THRESHOLD;
}

const NOISE_STDDEV_CEILING = 60; // channel stddev in a flat region at/above this maps to maximum noise

export function computeNoiseScore(flatRegionStdDev: number): number {
  return Math.max(0, Math.min(100, Math.round((flatRegionStdDev / NOISE_STDDEV_CEILING) * 100)));
}

const IDEAL_MEAN_LUMINANCE = 128; // mid-gray, 0-255 scale
const EXPOSURE_UNDER_THRESHOLD = 70;
const EXPOSURE_OVER_THRESHOLD = 190;

export interface ExposureResult {
  exposureScore: number; // 0-100, distance from ideal — 0 is worst
  assessment: "underexposed" | "good" | "overexposed";
}

export function evaluateExposure(meanLuminance: number): ExposureResult {
  const distance = Math.abs(meanLuminance - IDEAL_MEAN_LUMINANCE);
  const exposureScore = Math.max(0, Math.min(100, Math.round(100 - (distance / IDEAL_MEAN_LUMINANCE) * 100)));
  const assessment = meanLuminance < EXPOSURE_UNDER_THRESHOLD ? "underexposed" : meanLuminance > EXPOSURE_OVER_THRESHOLD ? "overexposed" : "good";
  return { exposureScore, assessment };
}

export interface QualityScoreInput {
  sharpnessScore: number;
  exposureScore: number;
  noiseScore: number; // higher = noisier, so this is inverted in the composite
  compositionScore: number;
  subjectProminenceScore: number;
}

/**
 * The single overall "Quality score" the brief names — a weighted
 * composite, not a separate model of its own. Composition and
 * subject prominence (the AI-judged, semantic half of the analysis)
 * are weighted equally to the three technical measures combined,
 * since a technically perfect but poorly-composed or empty-of-subject
 * photo isn't what a studio actually wants surfaced as a "best shot."
 */
export function computeQualityScore(input: QualityScoreInput): number {
  const technical = (input.sharpnessScore + input.exposureScore + (100 - input.noiseScore)) / 3;
  const semantic = (input.compositionScore + input.subjectProminenceScore) / 2;
  return Math.round(technical * 0.5 + semantic * 0.5);
}
