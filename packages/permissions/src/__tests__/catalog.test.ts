import { describe, expect, it } from "vitest";
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLE_DEFINITIONS,
  STUDIO_PERMISSIONS,
  STUDIO_ROLE_DEFINITIONS,
} from "../catalog";

describe("catalog integrity", () => {
  it("defines exactly the 5 required platform roles", () => {
    expect(Object.keys(PLATFORM_ROLE_DEFINITIONS).sort()).toEqual(
      ["platform_admin", "platform_finance", "platform_support", "platform_viewer", "super_admin"].sort(),
    );
  });

  it("defines exactly the 11 required studio roles", () => {
    expect(Object.keys(STUDIO_ROLE_DEFINITIONS).sort()).toEqual(
      [
        "owner",
        "admin",
        "manager",
        "sales",
        "photographer",
        "videographer",
        "editor",
        "album_designer",
        "accountant",
        "freelancer",
        "viewer",
      ].sort(),
    );
  });

  it("every platform role's permissions exist in the platform permission catalog", () => {
    const validKeys = new Set(PLATFORM_PERMISSIONS.map((p) => p.key));
    for (const [role, def] of Object.entries(PLATFORM_ROLE_DEFINITIONS)) {
      for (const permission of def.permissions) {
        expect(validKeys.has(permission), `${role} references unknown permission "${permission}"`).toBe(
          true,
        );
      }
    }
  });

  it("every studio role's permissions exist in the studio permission catalog", () => {
    const validKeys = new Set(STUDIO_PERMISSIONS.map((p) => p.key));
    for (const [role, def] of Object.entries(STUDIO_ROLE_DEFINITIONS)) {
      for (const permission of def.permissions) {
        expect(validKeys.has(permission), `${role} references unknown permission "${permission}"`).toBe(
          true,
        );
      }
    }
  });

  it("owner has every studio permission", () => {
    expect(STUDIO_ROLE_DEFINITIONS.owner.permissions.length).toBe(STUDIO_PERMISSIONS.length);
  });

  it("viewer only has :view permissions", () => {
    for (const permission of STUDIO_ROLE_DEFINITIONS.viewer.permissions) {
      expect(permission.endsWith(":view")).toBe(true);
    }
  });

  it("super_admin has every platform permission", () => {
    expect(PLATFORM_ROLE_DEFINITIONS.super_admin.permissions.length).toBe(PLATFORM_PERMISSIONS.length);
  });
});
