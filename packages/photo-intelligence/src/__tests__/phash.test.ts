import { describe, expect, it } from "vitest";
import { computeHammingDistance, classifyDuplicate, similarityScoreFromDistance } from "../phash";

describe("computeHammingDistance", () => {
  it("returns 0 for identical hashes", () => {
    expect(computeHammingDistance("1010", "1010")).toBe(0);
  });

  it("counts differing bits", () => {
    expect(computeHammingDistance("1010", "1111")).toBe(2);
  });

  it("throws on mismatched lengths", () => {
    expect(() => computeHammingDistance("10", "101")).toThrow();
  });
});

describe("classifyDuplicate", () => {
  it("classifies a near-zero distance as an exact duplicate", () => {
    expect(classifyDuplicate(1)).toBe("exact_duplicate");
  });

  it("classifies a moderate distance as a near duplicate", () => {
    expect(classifyDuplicate(8)).toBe("near_duplicate");
  });

  it("classifies a large distance as not a duplicate", () => {
    expect(classifyDuplicate(30)).toBe("not_duplicate");
  });
});

describe("similarityScoreFromDistance", () => {
  it("returns 100 for zero distance", () => {
    expect(similarityScoreFromDistance(0, 64)).toBe(100);
  });

  it("returns a lower score for a larger distance", () => {
    expect(similarityScoreFromDistance(32, 64)).toBe(50);
  });
});
