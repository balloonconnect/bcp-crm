import { describe, expect, it } from "vitest";
import { checkToolAccess } from "../permission-gating";

describe("checkToolAccess", () => {
  it("allows a read tool when the user has the required permission", () => {
    expect(checkToolAccess("list_events", ["event:view"], 1)).toEqual({ allowed: true });
  });

  it("denies a tool when the user lacks the required permission", () => {
    expect(checkToolAccess("list_events", [], 1)).toEqual({ allowed: false, reason: "permission_denied" });
  });

  it("denies an unknown tool", () => {
    expect(checkToolAccess("delete_everything", ["event:view"], 3)).toEqual({ allowed: false, reason: "tool_not_found" });
  });

  it("denies a write tool when the studio's build phase hasn't unlocked it yet", () => {
    expect(checkToolAccess("create_quotation", ["quotation:manage"], 1)).toEqual({ allowed: false, reason: "phase_locked" });
  });

  it("allows a write tool once the phase and permission both allow it", () => {
    expect(checkToolAccess("create_quotation", ["quotation:manage"], 2)).toEqual({ allowed: true });
  });

  it("treats phase 4 as unlocking the same tools as phase 3", () => {
    expect(checkToolAccess("create_shot_list", ["event:manage"], 4)).toEqual({ allowed: true });
  });
});
