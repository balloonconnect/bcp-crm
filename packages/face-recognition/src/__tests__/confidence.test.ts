import { describe, expect, it } from "vitest";
import { filterByConfidence } from "../confidence";

describe("filterByConfidence", () => {
  it("filters out matches below the threshold", () => {
    const matches = [{ providerFaceId: "a", confidence: 95 }, { providerFaceId: "b", confidence: 70 }];
    expect(filterByConfidence(matches, 90)).toEqual([{ providerFaceId: "a", confidence: 95 }]);
  });

  it("sorts remaining matches by confidence descending", () => {
    const matches = [{ providerFaceId: "a", confidence: 91 }, { providerFaceId: "b", confidence: 99 }];
    expect(filterByConfidence(matches, 90).map((m) => m.providerFaceId)).toEqual(["b", "a"]);
  });

  it("returns an empty array when nothing meets the threshold", () => {
    expect(filterByConfidence([{ providerFaceId: "a", confidence: 50 }], 90)).toEqual([]);
  });
});
