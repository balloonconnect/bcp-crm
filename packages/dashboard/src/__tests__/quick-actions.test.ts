import { describe, expect, it } from "vitest";
import { QUICK_ACTIONS, QUICK_ACTION_KEYS } from "../quick-actions";

describe("QUICK_ACTIONS", () => {
  it("has exactly the 8 actions named in the brief", () => {
    expect(QUICK_ACTIONS.length).toBe(8);
  });

  it("has unique keys", () => {
    expect(new Set(QUICK_ACTION_KEYS).size).toBe(8);
  });

  it("every action has a non-empty label and description", () => {
    for (const action of QUICK_ACTIONS) {
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.description.length).toBeGreaterThan(0);
    }
  });
});
