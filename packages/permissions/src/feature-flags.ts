/**
 * Pure resolution logic for the FeatureFlag model — see
 * @bcp/database docs/database-conventions.md § "Plan limits & feature
 * flags" for the full rationale. The caller is responsible for loading
 * the (at most) two FeatureFlag rows and the plan's `features` JSON;
 * this function only implements the precedence rule.
 */
export interface FeatureFlagResolutionInput {
  studioOverride?: { enabled: boolean } | null;
  globalDefault?: { enabled: boolean } | null;
  planDefault?: boolean;
}

export function resolveFeatureFlag(input: FeatureFlagResolutionInput): boolean {
  if (input.studioOverride) return input.studioOverride.enabled;
  if (input.globalDefault) return input.globalDefault.enabled;
  return input.planDefault ?? false;
}

export class FeatureNotEnabledError extends Error {
  readonly code = "FEATURE_NOT_ENABLED";
  constructor(featureKey: string) {
    super(`Feature "${featureKey}" is not enabled for this studio`);
    this.name = "FeatureNotEnabledError";
  }
}

export function assertFeatureEnabled(featureKey: string, resolved: boolean): void {
  if (!resolved) {
    throw new FeatureNotEnabledError(featureKey);
  }
}
