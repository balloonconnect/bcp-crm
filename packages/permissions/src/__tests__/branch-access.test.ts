import { describe, expect, it } from "vitest";
import { canAccessBranch, assertCanAccessBranch, BranchAccessDeniedError } from "../branch-access";
import type { StudioPermissionContext } from "../rbac";

function makeContext(branchId: string | null): StudioPermissionContext {
  return {
    actorType: "studio_user",
    studioUserId: "u1",
    studioId: "s1",
    branchId,
    roleKeys: ["manager"],
    permissions: [],
  };
}

describe("canAccessBranch", () => {
  it("allows access to any branch when the user is not branch-restricted", () => {
    const ctx = makeContext(null);
    expect(canAccessBranch(ctx, "branch-a")).toBe(true);
    expect(canAccessBranch(ctx, "branch-b")).toBe(true);
  });

  it("allows access to a branch-agnostic resource regardless of restriction", () => {
    const ctx = makeContext("branch-a");
    expect(canAccessBranch(ctx, null)).toBe(true);
    expect(canAccessBranch(ctx, undefined)).toBe(true);
  });

  it("allows access only to the user's own branch when restricted", () => {
    const ctx = makeContext("branch-a");
    expect(canAccessBranch(ctx, "branch-a")).toBe(true);
    expect(canAccessBranch(ctx, "branch-b")).toBe(false);
  });
});

describe("assertCanAccessBranch", () => {
  it("throws BranchAccessDeniedError when restricted and mismatched", () => {
    const ctx = makeContext("branch-a");
    expect(() => assertCanAccessBranch(ctx, "branch-b")).toThrow(BranchAccessDeniedError);
  });

  it("does not throw when access is allowed", () => {
    const ctx = makeContext(null);
    expect(() => assertCanAccessBranch(ctx, "branch-b")).not.toThrow();
  });
});
