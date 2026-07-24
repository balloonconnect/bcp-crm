import type { PriorityWeights } from "./weights";

export interface CullingPreset {
  key: string;
  label: string;
  weights: PriorityWeights;
}

/**
 * The 7 presets named in the brief, each a different default balance
 * of the same four priorities — not different logic paths. A wedding
 * leans hard on emotional moments and people balance (many named
 * guests, many rituals to represent); a corporate event leans on
 * technical quality and pose variety (headshots/candids need to look
 * clean and non-repetitive far more than they need "emotional
 * protection"); a school gallery leans heavily on people balance
 * (every student represented) over any single dramatic moment.
 */
export const CULLING_PRESETS: CullingPreset[] = [
  { key: "wedding", label: "Wedding", weights: { technicalQuality: 0.25, emotionalMoments: 0.35, peopleBalance: 0.2, poseVariety: 0.2 } },
  { key: "engagement", label: "Engagement", weights: { technicalQuality: 0.3, emotionalMoments: 0.35, peopleBalance: 0.15, poseVariety: 0.2 } },
  { key: "baby", label: "Baby", weights: { technicalQuality: 0.3, emotionalMoments: 0.4, peopleBalance: 0.1, poseVariety: 0.2 } },
  { key: "maternity", label: "Maternity", weights: { technicalQuality: 0.3, emotionalMoments: 0.35, peopleBalance: 0.1, poseVariety: 0.25 } },
  { key: "birthday", label: "Birthday", weights: { technicalQuality: 0.25, emotionalMoments: 0.3, peopleBalance: 0.25, poseVariety: 0.2 } },
  { key: "corporate", label: "Corporate", weights: { technicalQuality: 0.4, emotionalMoments: 0.15, peopleBalance: 0.2, poseVariety: 0.25 } },
  { key: "school", label: "School", weights: { technicalQuality: 0.35, emotionalMoments: 0.15, peopleBalance: 0.35, poseVariety: 0.15 } },
] as const;

export type CullingPresetKey = (typeof CULLING_PRESETS)[number]["key"];

export function getPresetWeights(presetKey: string): PriorityWeights {
  const preset = CULLING_PRESETS.find((p) => p.key === presetKey);
  if (!preset) throw new Error(`Unknown culling preset: ${presetKey}`);
  return preset.weights;
}
