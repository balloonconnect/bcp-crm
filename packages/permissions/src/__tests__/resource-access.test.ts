import { describe, expect, it } from "vitest";
import { canAccessResource } from "../resource-access";
import type { StudioPermissionContext } from "../rbac";

function makeContext(overrides: Partial<StudioPermissionContext> = {}): StudioPermissionContext {
  return {
    actorType: "studio_user",
    studioUserId: "u1",
    studioId: "s1",
    branchId: null,
    roleKeys: ["freelancer"],
    permissions: [],
    ...overrides,
  };
}

describe("canAccessResource", () => {
  it("grants access via the permission catalog", () => {
    const ctx = makeContext({ permissions: ["gallery:manage"] });
    expect(canAccessResource(ctx, { permission: "gallery:manage" })).toBe(true);
  });

  it("denies access without the permission and without ownership", () => {
    const ctx = makeContext({ permissions: [] });
    expect(canAccessResource(ctx, { permission: "gallery:manage" })).toBe(false);
  });

  it("grants access via ownership even without the permission", () => {
    const ctx = makeContext({ permissions: [], studioUserId: "u1" });
    expect(
      canAccessResource(ctx, {
        permission: "gallery:manage",
        resourceOwnerId: "u1",
        actorId: "u1",
      }),
    ).toBe(true);
  });

  it("denies access when the resource belongs to a different branch", () => {
    const ctx = makeContext({ permissions: ["gallery:manage"], branchId: "branch-a" });
    expect(
      canAccessResource(ctx, { permission: "gallery:manage", resourceBranchId: "branch-b" }),
    ).toBe(false);
  });

  it("ownership does not override a branch mismatch", () => {
    const ctx = makeContext({ permissions: [], branchId: "branch-a", studioUserId: "u1" });
    expect(
      canAccessResource(ctx, {
        permission: "gallery:manage",
        resourceBranchId: "branch-b",
        resourceOwnerId: "u1",
        actorId: "u1",
      }),
    ).toBe(false);
  });
});
