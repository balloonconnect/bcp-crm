import { describe, expect, it } from "vitest";
import { checkStudioSuspension, checkSubscriptionRestriction } from "../access-policy";

describe("checkStudioSuspension", () => {
  it("blocks a suspended studio", () => {
    expect(checkStudioSuspension("suspended")).toEqual({ allowed: false, reason: "suspended" });
  });

  it("blocks a cancelled studio", () => {
    expect(checkStudioSuspension("cancelled")).toEqual({ allowed: false, reason: "cancelled" });
  });

  it("allows trial, active, grace, and expired studios through this specific check", () => {
    for (const status of ["trial", "active", "grace", "expired"] as const) {
      expect(checkStudioSuspension(status)).toEqual({ allowed: true });
    }
  });
});

describe("checkSubscriptionRestriction", () => {
  it("blocks when the plan doesn't include the custom-domain feature", () => {
    const result = checkSubscriptionRestriction({ studioStatus: "active", customDomainFeatureEnabled: false });
    expect(result).toEqual({ allowed: false, reason: "feature_not_on_plan" });
  });

  it("blocks an expired subscription even with the feature enabled", () => {
    const result = checkSubscriptionRestriction({ studioStatus: "expired", customDomainFeatureEnabled: true });
    expect(result).toEqual({ allowed: false, reason: "expired" });
  });

  it("allows but flags degraded during the grace period", () => {
    const result = checkSubscriptionRestriction({ studioStatus: "grace", customDomainFeatureEnabled: true });
    expect(result).toEqual({ allowed: true, degraded: true, reason: "grace_period" });
  });

  it("allows cleanly for an active studio with the feature on", () => {
    const result = checkSubscriptionRestriction({ studioStatus: "active", customDomainFeatureEnabled: true });
    expect(result).toEqual({ allowed: true, degraded: false });
  });
});
