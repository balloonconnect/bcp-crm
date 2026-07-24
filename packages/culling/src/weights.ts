export interface PriorityWeights {
  technicalQuality: number;
  emotionalMoments: number;
  peopleBalance: number;
  poseVariety: number;
}

const WEIGHT_KEYS: (keyof PriorityWeights)[] = ["technicalQuality", "emotionalMoments", "peopleBalance", "poseVariety"];

/** Every weight set the pipeline actually uses is normalized to sum to 1 — a studio adjusting one slider up doesn't otherwise silently change what "100%" means for the others, and a preset's defaults are just as subject to this as a manual adjustment. */
export function normalizeWeights(weights: PriorityWeights): PriorityWeights {
  const total = WEIGHT_KEYS.reduce((sum, key) => sum + Math.max(0, weights[key]), 0);
  if (total === 0) return { technicalQuality: 0.25, emotionalMoments: 0.25, peopleBalance: 0.25, poseVariety: 0.25 };

  const normalized = {} as PriorityWeights;
  for (const key of WEIGHT_KEYS) normalized[key] = Math.max(0, weights[key]) / total;
  return normalized;
}

/** "Allow manual adjustment of AI priorities" — a studio's overrides replace only the keys they actually touched; anything unspecified keeps the preset's own default, then the whole result is renormalized so the combination is always internally consistent. */
export function mergeWeights(base: PriorityWeights, overrides: Partial<PriorityWeights>): PriorityWeights {
  return normalizeWeights({ ...base, ...overrides });
}
