import { describe, expect, it } from "vitest";
import { can, canAny, canAll, assertCan, PermissionDeniedError, flattenStudioPermissions } from "../rbac";
import type { StudioPermissionContext } from "../rbac";

function makeContext(permissions: string[], branchId: string | null = null): StudioPermissionContext {
  return {
    actorType: "studio_user",
    studioUserId: "u1",
    studioId: "s1",
    branchId,
    roleKeys: ["custom"],
    permissions: permissions as StudioPermissionContext["permissions"],
  };
}

describe("can / canAny / canAll", () => {
  it("returns true only for granted permissions", () => {
    const ctx = makeContext(["booking:view"]);
    expect(can(ctx, "booking:view")).toBe(true);
    expect(can(ctx, "booking:manage")).toBe(false);
  });

  it("canAny is true if at least one permission matches", () => {
    const ctx = makeContext(["gallery:view"]);
    expect(canAny(ctx, ["booking:manage", "gallery:view"])).toBe(true);
    expect(canAny(ctx, ["booking:manage", "album:manage"])).toBe(false);
  });

  it("canAll requires every permission", () => {
    const ctx = makeContext(["gallery:view", "gallery:manage"]);
    expect(canAll(ctx, ["gallery:view", "gallery:manage"])).toBe(true);
    expect(canAll(ctx, ["gallery:view", "album:manage"])).toBe(false);
  });
});

describe("assertCan", () => {
  it("does not throw when permitted", () => {
    const ctx = makeContext(["booking:manage"]);
    expect(() => assertCan(ctx, "booking:manage")).not.toThrow();
  });

  it("throws PermissionDeniedError when not permitted", () => {
    const ctx = makeContext([]);
    expect(() => assertCan(ctx, "booking:manage")).toThrow(PermissionDeniedError);
  });
});

describe("flattenStudioPermissions", () => {
  it("deduplicates permissions across multiple roles", () => {
    const result = flattenStudioPermissions([
      { key: "photographer", permissions: ["shoot:view", "gallery:view"] },
      { key: "editor", permissions: ["gallery:view", "gallery:manage"] },
    ]);
    expect(new Set(result)).toEqual(new Set(["shoot:view", "gallery:view", "gallery:manage"]));
    expect(result.length).toBe(3);
  });

  it("returns an empty array for a user with no roles", () => {
    expect(flattenStudioPermissions([])).toEqual([]);
  });
});
