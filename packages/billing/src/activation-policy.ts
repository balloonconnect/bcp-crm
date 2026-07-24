import { isLicenseUsable, type LicenseLifecycleInput } from "./license-lifecycle";

export type ActivationDenialReason =
  | "license_not_usable"
  | "max_activations_reached"
  | "domain_not_allowed"
  | "studio_mismatch";

export type ActivationDecision = { allowed: true } | { allowed: false; reason: ActivationDenialReason };

export interface ValidateActivationInput {
  license: LicenseLifecycleInput & {
    studioId: string;
    maxActivations: number;
    allowedDomains: string[];
  };
  /** Count of currently-active (non-deactivated) Activation rows for this license, excluding this attempt. */
  currentActiveActivationCount: number;
  /** The studio the activation request claims to be for. */
  requestingStudioId: string;
  /** The hostname the activation request came from, if any (checked against `allowedDomains` when the license restricts them). */
  requestingDomain?: string | null;
  now?: Date;
}

/**
 * The full activation gate: usability (status/expiry/grace), the
 * "allowed studio" restriction (a license only activates for the studio
 * it was issued to), the optional "allowed domains" restriction, and the
 * `maxActivations` ceiling. Order matters for the error message a caller
 * surfaces — checked from "is this license even valid" down to "is there
 * room for one more device".
 */
export function validateActivationAttempt(input: ValidateActivationInput): ActivationDecision {
  const now = input.now ?? new Date();

  if (!isLicenseUsable(input.license, now)) {
    return { allowed: false, reason: "license_not_usable" };
  }

  if (input.license.studioId !== input.requestingStudioId) {
    return { allowed: false, reason: "studio_mismatch" };
  }

  if (input.license.allowedDomains.length > 0 && input.requestingDomain) {
    const normalizedDomain = input.requestingDomain.toLowerCase();
    if (!input.license.allowedDomains.some((d) => d.toLowerCase() === normalizedDomain)) {
      return { allowed: false, reason: "domain_not_allowed" };
    }
  }

  if (input.currentActiveActivationCount >= input.license.maxActivations) {
    return { allowed: false, reason: "max_activations_reached" };
  }

  return { allowed: true };
}
