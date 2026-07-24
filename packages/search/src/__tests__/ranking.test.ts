import { describe, expect, it } from "vitest";
import { mergeAndRankResults, scoreMatch } from "../ranking";

const result = (id: string, score: number) => ({ entityType: "lead", entityId: id, title: id, subtitle: null, score, url: `/leads/${id}` });

describe("mergeAndRankResults", () => {
  it("merges multiple result sets sorted by score descending", () => {
    const merged = mergeAndRankResults([[result("a", 0.5)], [result("b", 0.9), result("c", 0.2)]], 10);
    expect(merged.map((r) => r.entityId)).toEqual(["b", "a", "c"]);
  });

  it("caps the total result count", () => {
    const merged = mergeAndRankResults([[result("a", 0.9), result("b", 0.8), result("c", 0.7)]], 2);
    expect(merged).toHaveLength(2);
  });
});

describe("scoreMatch", () => {
  it("scores an exact match highest", () => {
    expect(scoreMatch("Sharma Wedding", "Sharma Wedding")).toBe(1);
  });

  it("scores a prefix match second", () => {
    expect(scoreMatch("Sharma Wedding", "Sharma")).toBe(0.8);
  });

  it("scores a substring match lowest (but nonzero)", () => {
    expect(scoreMatch("Sharma Wedding", "Wedding")).toBe(0.5);
  });

  it("scores a non-match as zero", () => {
    expect(scoreMatch("Sharma Wedding", "Gupta")).toBe(0);
  });
});
