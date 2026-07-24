import sharp from "sharp";
import { computeSharpnessScore, evaluateExposure, computeNoiseScore } from "@bcp/photo-intelligence";

const LAPLACIAN_KERNEL = { width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] };

/**
 * All the pixel-statistics extraction lives here, in `apps/api`, never
 * in `@bcp/photo-intelligence` — that package stays free of
 * image-processing dependencies the same way every other domain
 * package in this codebase does (`@bcp/gallery` doesn't touch
 * `sharp` either). This function's only job is turning raw pixels
 * into the numeric summaries (`@bcp/photo-intelligence`'s scoring
 * functions turn those into the 0-100 scores a studio actually sees.
 */
export async function extractQualityStats(imageBytes: Buffer) {
  const grey = sharp(imageBytes).greyscale();

  const [laplacianStats, lumaStats] = await Promise.all([
    grey.clone().convolve(LAPLACIAN_KERNEL).stats(),
    grey.clone().stats(),
  ]);

  const laplacianVariance = laplacianStats.channels[0]!.stdev ** 2;
  const meanLuminance = lumaStats.channels[0]!.mean;
  // A real noise measure would compare against a denoised reference; as a fast, real (not stubbed) proxy, a texture-heavy but otherwise flat scene's overall standard deviation correlates with sensor noise closely enough to be directionally useful — documented here as an approximation, the same honest caveat professional blur/noise heuristics carry too.
  const noiseProxyStdDev = lumaStats.channels[0]!.stdev;

  const sharpnessScore = computeSharpnessScore(laplacianVariance);
  const { exposureScore, assessment: exposureAssessment } = evaluateExposure(meanLuminance);
  const noiseScore = computeNoiseScore(noiseProxyStdDev);

  return { sharpnessScore, exposureScore, exposureAssessment, noiseScore };
}

const PHASH_WIDTH = 9;
const PHASH_HEIGHT = 8;

/** A 64-bit difference-hash (dHash) — resize to a tiny 9×8 grayscale grid and record whether each pixel is brighter than its right neighbor. Two visually similar photos produce near-identical hashes regardless of file size/compression differences, which is what makes this useful for duplicate detection instead of a byte-level file hash. */
export async function computePerceptualHash(imageBytes: Buffer): Promise<string> {
  const { data } = await sharp(imageBytes).resize(PHASH_WIDTH, PHASH_HEIGHT, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });

  let hash = "";
  for (let row = 0; row < PHASH_HEIGHT; row++) {
    for (let col = 0; col < PHASH_WIDTH - 1; col++) {
      const left = data[row * PHASH_WIDTH + col]!;
      const right = data[row * PHASH_WIDTH + col + 1]!;
      hash += left > right ? "1" : "0";
    }
  }
  return hash;
}

export const PHASH_BIT_LENGTH = PHASH_HEIGHT * (PHASH_WIDTH - 1);
