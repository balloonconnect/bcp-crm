import { describe, expect, it } from "vitest";
import { PIPELINE_STAGES, LEAD_STATUS_KEYS, getPipelineStage, isClosedStage, LEAD_PRIORITIES, LEAD_SOURCES } from "../pipeline";

describe("PIPELINE_STAGES", () => {
  it("has exactly the 9 stages named in the brief", () => {
    expect(PIPELINE_STAGES.length).toBe(9);
  });

  it("has unique keys and sequential order", () => {
    expect(new Set(LEAD_STATUS_KEYS).size).toBe(9);
    const orders = PIPELINE_STAGES.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 9 }, (_, i) => i + 1));
  });

  it("only won and lost are closed stages", () => {
    const closed = PIPELINE_STAGES.filter((s) => s.kind === "closed").map((s) => s.key);
    expect(closed.sort()).toEqual(["lost", "won"]);
  });

  it("isClosedStage matches stage kind", () => {
    expect(isClosedStage("won")).toBe(true);
    expect(isClosedStage("lost")).toBe(true);
    expect(isClosedStage("new")).toBe(false);
    expect(isClosedStage("negotiation")).toBe(false);
  });

  it("getPipelineStage throws for an unknown status", () => {
    expect(() => getPipelineStage("bogus" as never)).toThrow();
  });
});

describe("LEAD_PRIORITIES / LEAD_SOURCES", () => {
  it("has 4 priorities with increasing weight", () => {
    expect(LEAD_PRIORITIES.length).toBe(4);
    const weights = LEAD_PRIORITIES.map((p) => p.weight);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
  });

  it("has 6 sources", () => {
    expect(LEAD_SOURCES.length).toBe(6);
  });
});
