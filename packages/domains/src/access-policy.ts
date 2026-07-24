/**
 * Two independent checks the secure hostname middleware runs after
 * resolving *which* studio a custom domain belongs to, before letting the
 * request through — see docs/custom-domains.md § "Secure hostname
 * middleware". Kept as pure functions here so the policy itself
 * (thresholds, which statuses block) is unit-testable without spinning up
 * Fastify or a database.
 */

export type StudioStatus = "trial" | "active" | "grace" | "suspended" | "expired" | "cancelled";

export interface SuspensionCheckResult {
  allowed: boolean;
  reason?: "suspended" | "cancelled";
}

/** A suspended or cancelled studio's custom domains stop resolving entirely — this is the harder, unconditional block. */
export function checkStudioSuspension(status: StudioStatus): SuspensionCheckResult {
  if (status === "suspended") return { allowed: false, reason: "suspended" };
  if (status === "cancelled") return { allowed: false, reason: "cancelled" };
  return { allowed: true };
}

export interface SubscriptionRestrictionInput {
  studioStatus: StudioStatus;
  /** Resolved via @bcp/permissions' feature-flag resolution (custom_domain feature key). */
  customDomainFeatureEnabled: boolean;
}

export type SubscriptionRestrictionResult =
  | { allowed: true; degraded: false }
  | { allowed: true; degraded: true; reason: "grace_period" }
  | { allowed: false; reason: "feature_not_on_plan" | "expired" };

/**
 * Softer than suspension: a studio in its billing `grace` period still
 * resolves on its custom domain (so a temporarily-lapsed payment doesn't
 * immediately take a live client-facing gallery offline) but is flagged
 * `degraded` so the caller can show a billing-issue banner. A studio whose
 * plan simply doesn't include the custom-domain feature (e.g. downgraded
 * from Studio to Starter) or whose subscription has hard-`expired` is
 * blocked outright — the studio still exists and can be reached via the
 * default `*.bcpstudio.os` hostname, just not this custom one.
 */
export function checkSubscriptionRestriction(
  input: SubscriptionRestrictionInput,
): SubscriptionRestrictionResult {
  if (input.studioStatus === "expired") {
    return { allowed: false, reason: "expired" };
  }
  if (!input.customDomainFeatureEnabled) {
    return { allowed: false, reason: "feature_not_on_plan" };
  }
  if (input.studioStatus === "grace") {
    return { allowed: true, degraded: true, reason: "grace_period" };
  }
  return { allowed: true, degraded: false };
}
