import { describe, expect, it } from "vitest";
import { canTransitionAction, canReverseAction } from "../confirmation";
import { dedupeSourceReferences } from "../source-references";

describe("canTransitionAction", () => {
  it("allows draft to confirmed", () => {
    expect(canTransitionAction("draft", "confirmed")).toBe(true);
  });

  it("rejects skipping straight from draft to executed", () => {
    expect(canTransitionAction("draft", "executed")).toBe(false);
  });

  it("allows executed to reversed", () => {
    expect(canTransitionAction("executed", "reversed")).toBe(true);
  });

  it("rejected and reversed are terminal states", () => {
    expect(canTransitionAction("rejected", "confirmed")).toBe(false);
    expect(canTransitionAction("reversed", "executed")).toBe(false);
  });
});

describe("canReverseAction", () => {
  it("allows reversing an executed, reversible action", () => {
    expect(canReverseAction("executed", true)).toBe(true);
  });

  it("blocks reversing a non-reversible action even if executed", () => {
    expect(canReverseAction("executed", false)).toBe(false);
  });

  it("blocks reversing an action that hasn't executed yet", () => {
    expect(canReverseAction("confirmed", true)).toBe(false);
  });
});

describe("dedupeSourceReferences", () => {
  it("removes duplicate type+id references", () => {
    const refs = [{ type: "Event", id: "1" }, { type: "Event", id: "1" }, { type: "Invoice", id: "2" }];
    expect(dedupeSourceReferences(refs)).toHaveLength(2);
  });
});
