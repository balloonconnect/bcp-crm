import { describe, expect, it } from "vitest";
import { DEFAULT_WORKFLOW_STAGES, getDefaultStageLabel } from "../default-workflow";

describe("DEFAULT_WORKFLOW_STAGES", () => {
  it("has exactly the 17 stages named in the brief", () => {
    expect(DEFAULT_WORKFLOW_STAGES.length).toBe(17);
  });

  it("has unique keys in sequential order", () => {
    const keys = DEFAULT_WORKFLOW_STAGES.map((s) => s.key);
    expect(new Set(keys).size).toBe(17);
    const orders = DEFAULT_WORKFLOW_STAGES.map((s) => s.order);
    expect(orders).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  });

  it("starts with enquiry and ends with completion", () => {
    expect(DEFAULT_WORKFLOW_STAGES[0]!.key).toBe("enquiry");
    expect(DEFAULT_WORKFLOW_STAGES[16]!.key).toBe("completion");
  });

  it("getDefaultStageLabel resolves a known stage", () => {
    expect(getDefaultStageLabel("shoot")).toBe("Shoot");
  });

  it("falls back to the raw key for an unknown stage", () => {
    expect(getDefaultStageLabel("bogus")).toBe("bogus");
  });
});
