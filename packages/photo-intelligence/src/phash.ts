export type DuplicateClassification = "exact_duplicate" | "near_duplicate" | "not_duplicate";

const EXACT_DUPLICATE_MAX_DISTANCE = 2; // out of a typical 64-bit perceptual hash — near-zero difference
const NEAR_DUPLICATE_MAX_DISTANCE = 10; // burst-mode shots, minor pose/framing changes

/** Hamming distance between two equal-length binary hash strings — the actual perceptual hash (a difference-hash over a downscaled grayscale image) is computed server-side via `sharp`; this package only compares the resulting bit strings, which is the part that's pure and independently testable. */
export function computeHammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) throw new Error("Hashes must be the same length to compare");
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) if (hashA[i] !== hashB[i]) distance++;
  return distance;
}

/** Classifies two photos' relationship from their hash distance — the same three-tier read the brief's "Duplicate detection" (exact) vs. "Near-duplicate grouping" (near) distinguishes. */
export function classifyDuplicate(hammingDistance: number): DuplicateClassification {
  if (hammingDistance <= EXACT_DUPLICATE_MAX_DISTANCE) return "exact_duplicate";
  if (hammingDistance <= NEAR_DUPLICATE_MAX_DISTANCE) return "near_duplicate";
  return "not_duplicate";
}

/** Converts a Hamming distance into a 0-100 "how similar" score for display — purely a presentation transform of the same distance `classifyDuplicate` already judges, over a hash of `hashLength` bits. */
export function similarityScoreFromDistance(hammingDistance: number, hashLength: number): number {
  return Math.max(0, Math.round(100 - (hammingDistance / hashLength) * 100));
}
