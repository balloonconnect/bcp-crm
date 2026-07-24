import { describe, expect, it } from "vitest";
import { CULLING_PRESETS, getPresetWeights } from "../presets";

describe("CULLING_PRESETS", () => {
  it("has exactly the 7 presets named in the brief", () => {
    expect(CULLING_PRESETS.map((p) => p.key)).toEqual(["wedding", "engagement", "baby", "maternity", "birthday", "corporate", "school"]);
  });

  it("every preset's weights sum to 1", () => {
    for (const preset of CULLING_PRESETS) {
      const total = Object.values(preset.weights).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1);
    }
  });
});

describe("getPresetWeights", () => {
  it("returns the wedding preset's weights", () => {
    expect(getPresetWeights("wedding").emotionalMoments).toBe(0.35);
  });

  it("throws for an unknown preset", () => {
    expect(() => getPresetWeights("quinceañera")).toThrow();
  });
});
