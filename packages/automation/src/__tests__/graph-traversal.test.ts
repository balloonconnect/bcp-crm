import { describe, expect, it } from "vitest";
import { resolveNextStep, findEntryStep, detectCycle } from "../graph-traversal";

describe("resolveNextStep", () => {
  it("follows nextStepId for a non-branch action", () => {
    expect(resolveNextStep({ id: "a", actionType: "send_email", nextStepId: "b", conditionTrueStepId: null, conditionFalseStepId: null })).toBe("b");
  });

  it("follows the true branch when the condition is true", () => {
    expect(resolveNextStep({ id: "a", actionType: "condition_branch", nextStepId: null, conditionTrueStepId: "t", conditionFalseStepId: "f" }, true)).toBe("t");
  });

  it("follows the false branch when the condition is false", () => {
    expect(resolveNextStep({ id: "a", actionType: "condition_branch", nextStepId: null, conditionTrueStepId: "t", conditionFalseStepId: "f" }, false)).toBe("f");
  });
});

describe("findEntryStep", () => {
  it("finds the single entry point", () => {
    expect(findEntryStep([{ id: "a", isEntryPoint: true }, { id: "b", isEntryPoint: false }])).toBe("a");
  });

  it("returns null when there is no entry point", () => {
    expect(findEntryStep([{ id: "a", isEntryPoint: false }])).toBeNull();
  });

  it("returns null when there are multiple entry points", () => {
    expect(findEntryStep([{ id: "a", isEntryPoint: true }, { id: "b", isEntryPoint: true }])).toBeNull();
  });
});

describe("detectCycle", () => {
  it("returns false for a linear graph", () => {
    const steps = [
      { id: "a", actionType: "send_email", nextStepId: "b", conditionTrueStepId: null, conditionFalseStepId: null },
      { id: "b", actionType: "send_email", nextStepId: null, conditionTrueStepId: null, conditionFalseStepId: null },
    ];
    expect(detectCycle(steps, "a")).toBe(false);
  });

  it("detects a cycle back to an earlier step", () => {
    const steps = [
      { id: "a", actionType: "send_email", nextStepId: "b", conditionTrueStepId: null, conditionFalseStepId: null },
      { id: "b", actionType: "send_email", nextStepId: "a", conditionTrueStepId: null, conditionFalseStepId: null },
    ];
    expect(detectCycle(steps, "a")).toBe(true);
  });
});
