import { prisma } from "@bcp/database";
import { validateActivationAttempt, type ActivationDenialReason } from "@bcp/billing";

export class LicenseKeyInvalidError extends Error {
  readonly code = "LICENSE_KEY_INVALID";
  constructor() {
    super("License key not found");
    this.name = "LicenseKeyInvalidError";
  }
}

export class ActivationDeniedError extends Error {
  readonly code = "ACTIVATION_DENIED";
  constructor(public readonly reason: ActivationDenialReason) {
    super(`Activation denied: ${reason}`);
    this.name = "ActivationDeniedError";
  }
}

/**
 * The device-facing activation endpoint's service logic — authenticated
 * by the license key itself (like an API key), not a studio session,
 * since this is typically called by a self-hosted deployment's install
 * script or an app binary before any human has signed in. Runs the full
 * `@bcp/billing` activation policy (usability, allowed studio, allowed
 * domains, `maxActivations`) before writing an `Activation` row.
 */
export async function activateLicense(input: {
  key: string;
  studioId: string;
  fingerprint: string;
  hostname?: string;
  ipAddress?: string;
  domain?: string;
  deviceMetadata?: Record<string, unknown>;
}) {
  const license = await prisma.licenseKey.findUnique({ where: { key: input.key } });
  if (!license) throw new LicenseKeyInvalidError();

  const activeCount = await prisma.activation.count({
    where: { licenseKeyId: license.id, status: "active" },
  });

  // Idempotent: re-activating the same device (same fingerprint) doesn't
  // count against maxActivations a second time — it just refreshes
  // lastSeenAt on the existing row.
  const existing = await prisma.activation.findFirst({
    where: { licenseKeyId: license.id, fingerprint: input.fingerprint, status: "active" },
  });
  if (existing) {
    return prisma.activation.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), ipAddress: input.ipAddress, deviceMetadata: input.deviceMetadata },
    });
  }

  const decision = validateActivationAttempt({
    license: {
      status: license.status,
      expiresAt: license.expiresAt,
      graceEndsAt: license.graceEndsAt,
      studioId: license.studioId,
      maxActivations: license.maxActivations,
      allowedDomains: license.allowedDomains,
    },
    currentActiveActivationCount: activeCount,
    requestingStudioId: input.studioId,
    requestingDomain: input.domain,
  });

  if (!decision.allowed) {
    throw new ActivationDeniedError(decision.reason);
  }

  return prisma.activation.create({
    data: {
      licenseKeyId: license.id,
      studioId: license.studioId,
      fingerprint: input.fingerprint,
      hostname: input.hostname,
      ipAddress: input.ipAddress,
      deviceMetadata: input.deviceMetadata,
      status: "active",
      lastSeenAt: new Date(),
    },
  });
}
