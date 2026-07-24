import { describe, expect, it } from "vitest";
import { resolveReviewTransition, resolveUndo } from "../review";

describe("resolveReviewTransition", () => {
  it("resolves approve", () => {
    expect(resolveReviewTransition("approve")).toEqual({ newStatus: "approved", action: "approved" });
  });

  it("resolves reject", () => {
    expect(resolveReviewTransition("reject")).toEqual({ newStatus: "rejected", action: "rejected" });
  });
});

describe("resolveUndo", () => {
  it("restores the previous status from the log", () => {
    expect(resolveUndo({ previousStatus: "pending", newStatus: "approved", action: "approved" })).toBe("pending");
  });

  it("can restore back to a previously-approved status", () => {
    expect(resolveUndo({ previousStatus: "approved", newStatus: "rejected", action: "rejected" })).toBe("approved");
  });

  it("throws when trying to undo an already-undone entry", () => {
    expect(() => resolveUndo({ previousStatus: "pending", newStatus: "approved", action: "undone" })).toThrow();
  });
});
