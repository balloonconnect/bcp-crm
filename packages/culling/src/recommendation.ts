import type { PriorityWeights } from "./weights";

export type CullingRecommendationType = "include" | "exclude" | "review";

export interface PhotoForCulling {
  qualityScore: number; // 0-100, from PhotoAnalysis (Prompt 29)
  technicalIssues: string[]; // e.g. ["blurry", "closed_eyes"]
  isEmotionalMoment: boolean; // studio- or AI-flagged (e.g. a moment tag matched, or a duplicate-group's approved keeper)
  isDuplicateNonBest: boolean; // a member of a duplicate/near-duplicate group that isn't the group's best shot
  isRepeatedPose: boolean;
}

export interface CullingVerdict {
  recommendation: CullingRecommendationType;
  confidence: number;
  reason: string;
}

const INCLUDE_THRESHOLD = 65;
const EXCLUDE_THRESHOLD = 35;

/**
 * The single scoring function every culling recommendation comes
 * from — combines the photo's own technical quality with the
 * studio's chosen priority weights, then applies two *overrides* on
 * top of the raw score, in a fixed order:
 *
 * 1. "Protect emotional moments" — `isEmotionalMoment` can only ever
 *    pull a recommendation *up* (from exclude/review toward include),
 *    never down. A technically imperfect but emotionally significant
 *    photo (a genuine candid tear, a slightly soft ring-exchange shot)
 *    is exactly the case this exists to protect — the AI is deliberately
 *    biased toward keeping it, weighted by how much the studio's own
 *    `emotionalMoments` priority matters to them.
 * 2. "Avoid repeated poses" / duplicate suppression — only applied
 *    *after* the emotional-moment protection, and only ever pulls a
 *    recommendation down, never overriding an emotional-moment
 *    protection outright — a near-duplicate of an emotionally
 *    significant moment still gets a `review` floor, not a hard
 *    `exclude`, so a studio's own eyes make the final call rather than
 *    the AI silently dropping a second angle of a real moment.
 *
 * Confidence reflects how far the final score sits from the
 * thresholds — a score right at the boundary between include/review
 * is genuinely less certain than one deep in either direction, and the
 * AI says so rather than reporting false certainty.
 */
export function resolveCullingRecommendation(photo: PhotoForCulling, weights: PriorityWeights): CullingVerdict {
  // Quality score is the base; the studio's technicalQuality priority only modulates how harshly technical issues are penalized, not the base score itself — a studio that cares more about technical quality docks flawed photos harder, but a flawless photo's score is never compressed just because some priority weight happens to be low.
  const technicalPenalty = photo.technicalIssues.length * 15 * (0.5 + weights.technicalQuality);
  let score = photo.qualityScore - technicalPenalty;

  const reasons: string[] = [];
  if (photo.technicalIssues.length > 0) reasons.push(`Technical issues detected: ${photo.technicalIssues.join(", ")}.`);

  if (photo.isEmotionalMoment) {
    const boost = 30 * weights.emotionalMoments * 2; // scaled so a studio's max emotional-moments weight can fully rescue a borderline photo
    score = Math.max(score, score + boost, INCLUDE_THRESHOLD - 5);
    reasons.push("Flagged as an emotionally significant moment — protected from exclusion regardless of minor technical softness.");
  }

  if ((photo.isDuplicateNonBest || photo.isRepeatedPose) && !photo.isEmotionalMoment) {
    score -= 20 * (1 - weights.poseVariety * 0.5);
    reasons.push("Similar framing/pose already represented by a stronger shot in this set.");
  } else if ((photo.isDuplicateNonBest || photo.isRepeatedPose) && photo.isEmotionalMoment) {
    score = Math.min(score, INCLUDE_THRESHOLD - 1); // floor at "review," never a hard include, never a hard exclude
    reasons.push("A near-duplicate of a protected emotional moment — flagged for the studio's own pick rather than auto-decided.");
  }

  score = Math.max(0, Math.min(100, score));

  const recommendation: CullingRecommendationType = score >= INCLUDE_THRESHOLD ? "include" : score <= EXCLUDE_THRESHOLD ? "exclude" : "review";
  const distanceFromNearestThreshold = recommendation === "review" ? Math.min(Math.abs(score - INCLUDE_THRESHOLD), Math.abs(score - EXCLUDE_THRESHOLD)) : Math.abs(score - (recommendation === "include" ? INCLUDE_THRESHOLD : EXCLUDE_THRESHOLD));
  const confidence = Math.round(Math.min(95, 50 + distanceFromNearestThreshold * 1.5));

  if (reasons.length === 0) reasons.push(recommendation === "include" ? "Strong technical quality with no issues detected." : "Overall quality score below the include threshold for this gallery's priorities.");

  return { recommendation, confidence, reason: reasons.join(" ") };
}
