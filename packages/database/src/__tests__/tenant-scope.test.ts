import { describe, expect, it } from "vitest";
import {
  isTenantScopedModel,
  scopeWhere,
  scopeData,
  scopeDataArray,
  CrossTenantAccessError,
  TENANT_SCOPED_MODELS,
} from "../tenant-scope";

const STUDIO_A = "11111111-1111-1111-1111-111111111111";
const STUDIO_B = "22222222-2222-2222-2222-222222222222";

describe("isTenantScopedModel", () => {
  it("recognizes every declared tenant-scoped model", () => {
    for (const model of TENANT_SCOPED_MODELS) {
      expect(isTenantScopedModel(model)).toBe(true);
    }
  });

  it("rejects models that are not tenant-scoped", () => {
    expect(isTenantScopedModel("studio")).toBe(false);
    expect(isTenantScopedModel("subscriptionPlan")).toBe(false);
    expect(isTenantScopedModel("platformUser")).toBe(false);
  });
});

describe("scopeWhere", () => {
  it("injects studioId into an empty where clause", () => {
    expect(scopeWhere("studioUser", undefined, STUDIO_A)).toEqual({ studioId: STUDIO_A });
  });

  it("merges studioId alongside existing filters", () => {
    expect(scopeWhere("studioUser", { status: "active" }, STUDIO_A)).toEqual({
      status: "active",
      studioId: STUDIO_A,
    });
  });

  it("is a no-op when the caller already passed the matching studioId", () => {
    expect(scopeWhere("studioUser", { studioId: STUDIO_A }, STUDIO_A)).toEqual({
      studioId: STUDIO_A,
    });
  });

  it("throws CrossTenantAccessError when studioId conflicts", () => {
    expect(() => scopeWhere("studioUser", { studioId: STUDIO_B }, STUDIO_A)).toThrow(
      CrossTenantAccessError,
    );
  });
});

describe("scopeData", () => {
  it("injects studioId into create data", () => {
    expect(scopeData("studioBranch", { name: "HQ" }, STUDIO_A)).toEqual({
      name: "HQ",
      studioId: STUDIO_A,
    });
  });

  it("throws on a conflicting studioId in create data", () => {
    expect(() =>
      scopeData("studioBranch", { name: "HQ", studioId: STUDIO_B }, STUDIO_A),
    ).toThrow(CrossTenantAccessError);
  });
});

describe("scopeDataArray", () => {
  it("scopes every item for createMany", () => {
    const result = scopeDataArray(
      "usageRecord",
      [{ metric: "storage_gb" }, { metric: "bookings_created" }],
      STUDIO_A,
    );
    expect(result).toEqual([
      { metric: "storage_gb", studioId: STUDIO_A },
      { metric: "bookings_created", studioId: STUDIO_A },
    ]);
  });

  it("throws if any item has a conflicting studioId", () => {
    expect(() =>
      scopeDataArray(
        "usageRecord",
        [{ metric: "storage_gb", studioId: STUDIO_A }, { metric: "x", studioId: STUDIO_B }],
        STUDIO_A,
      ),
    ).toThrow(CrossTenantAccessError);
  });
});
