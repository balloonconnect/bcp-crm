import { resolveTxt, resolveCname } from "node:dns/promises";
import { prisma } from "@bcp/database";
import { generateOpaqueToken } from "@bcp/auth";
import {
  validateHostHeader,
  generateDnsInstructions,
  isApexDomain,
  evaluateVerification,
  evaluateRetry,
  nextSslStatusAfterVerification,
  canActivate,
  type DomainPurpose,
  type PlatformDomainConfig,
} from "@bcp/domains";
import { getEnv } from "@bcp/config";
import { assertWithinPlanLimit } from "./plan-limit-enforcement";

function platformConfig(): PlatformDomainConfig {
  const env = getEnv();
  return {
    cnameTarget: env.DOMAIN_CNAME_TARGET,
    apexIpAddresses: env.DOMAIN_APEX_IPS.split(",").map((s) => s.trim()).filter(Boolean),
  };
}

async function writeAuditLog(input: {
  studioId: string;
  actorId: string;
  action: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      studioId: input.studioId,
      actorType: "studio_user",
      actorId: input.actorId,
      action: input.action,
      resourceType: "StudioDomain",
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}

export class InvalidDomainError extends Error {
  readonly code = "INVALID_DOMAIN";
  constructor(reason: string) {
    super(`Invalid domain: ${reason}`);
    this.name = "InvalidDomainError";
  }
}

export class DomainAlreadyExistsError extends Error {
  readonly code = "DOMAIN_ALREADY_EXISTS";
  constructor() {
    super("This domain is already registered to a studio");
    this.name = "DomainAlreadyExistsError";
  }
}

export class DomainNotFoundError extends Error {
  readonly code = "DOMAIN_NOT_FOUND";
  constructor() {
    super("Domain not found");
    this.name = "DomainNotFoundError";
  }
}

export class DomainNotReadyToActivateError extends Error {
  readonly code = "DOMAIN_NOT_READY";
  constructor() {
    super("Domain must be verified and have SSL issued before activation");
    this.name = "DomainNotReadyToActivateError";
  }
}

/** Adds a new custom domain in `pending` status and issues its TXT verification token. */
export async function addDomain(input: {
  studioId: string;
  domain: string;
  purpose: DomainPurpose;
  actorId: string;
}) {
  const validation = validateHostHeader(input.domain, { disallowIpLiterals: true });
  if (!validation.ok) throw new InvalidDomainError(validation.reason);

  const existing = await prisma.studioDomain.findUnique({ where: { domain: validation.hostname } });
  if (existing && !existing.deletedAt) throw new DomainAlreadyExistsError();

  // Enforce the plan's custom-domain limit — see
  // apps/api/src/services/plan-limit-enforcement.ts.
  await assertWithinPlanLimit(input.studioId, "maxCustomDomains");

  const verificationToken = generateOpaqueToken(24);
  const method = isApexDomain(validation.hostname) ? "txt" : "cname";

  const created = await prisma.studioDomain.create({
    data: {
      studioId: input.studioId,
      domain: validation.hostname,
      purpose: input.purpose,
      status: "pending",
      verificationMethod: method,
      verificationToken,
      cnameTarget: platformConfig().cnameTarget,
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    studioId: input.studioId,
    actorId: input.actorId,
    action: "domain.added",
    resourceId: created.id,
    metadata: { domain: created.domain, purpose: created.purpose },
  });

  return created;
}

export function getDnsInstructions(domain: { domain: string; verificationToken: string | null }) {
  if (!domain.verificationToken) {
    throw new InvalidDomainError("no verification token issued for this domain");
  }
  return generateDnsInstructions(domain.domain, domain.verificationToken, platformConfig());
}

/** Performs a real DNS lookup and evaluates ownership verification, updating status/retry state accordingly. */
export async function verifyDomain(domainId: string, studioId: string, actorId: string) {
  const domain = await prisma.studioDomain.findFirst({ where: { id: domainId, studioId, deletedAt: null } });
  if (!domain) throw new DomainNotFoundError();

  const lookupLabel =
    domain.verificationMethod === "txt" ? `_bcp-verify.${domain.domain}` : domain.domain;

  let lookupResult: string[][] | string[] | null;
  try {
    lookupResult =
      domain.verificationMethod === "txt" ? await resolveTxt(lookupLabel) : await resolveCname(lookupLabel);
  } catch {
    lookupResult = null;
  }

  const outcome = evaluateVerification({
    method: domain.verificationMethod,
    expectedValue: domain.verificationMethod === "txt" ? domain.verificationToken! : domain.cnameTarget!,
    lookupResult,
  });

  const attempts = domain.verificationAttempts + 1;
  const now = new Date();

  if (outcome.verified) {
    const nextSsl = nextSslStatusAfterVerification({ currentStatus: domain.sslStatus, verified: true });
    const updated = await prisma.studioDomain.update({
      where: { id: domainId },
      data: {
        status: "verified",
        verifiedAt: now,
        verificationAttempts: attempts,
        lastVerificationAttemptAt: now,
        nextRetryAt: null,
        sslStatus: nextSsl,
        updatedBy: actorId,
      },
    });

    await writeAuditLog({ studioId, actorId, action: "domain.verified", resourceId: domainId });
    return updated;
  }

  const retry = evaluateRetry(attempts, now);
  const updated = await prisma.studioDomain.update({
    where: { id: domainId },
    data: {
      status: retry.exhausted ? "failed" : "verifying",
      verificationAttempts: attempts,
      lastVerificationAttemptAt: now,
      nextRetryAt: retry.nextRetryAt,
      updatedBy: actorId,
    },
  });

  await writeAuditLog({
    studioId,
    actorId,
    action: retry.exhausted ? "domain.verification_failed" : "domain.verification_retry_scheduled",
    resourceId: domainId,
    metadata: { reason: outcome.verified ? undefined : outcome.reason, attempts },
  });

  return updated;
}

/** Called by a periodic worker job for every domain whose `nextRetryAt` has passed — see apps/worker. */
export async function listDomainsDueForRetry(now = new Date()) {
  return prisma.studioDomain.findMany({
    where: { status: "verifying", nextRetryAt: { lte: now }, deletedAt: null },
  });
}

/** Records that SSL has been issued (called by a certificate-manager webhook/job, not directly by a user). */
export async function markSslIssued(domainId: string, expiresAt: Date) {
  return prisma.studioDomain.update({
    where: { id: domainId },
    data: { sslStatus: "issued", sslIssuedAt: new Date(), sslExpiresAt: expiresAt },
  });
}

export async function activateDomain(domainId: string, studioId: string, actorId: string) {
  const domain = await prisma.studioDomain.findFirst({ where: { id: domainId, studioId, deletedAt: null } });
  if (!domain) throw new DomainNotFoundError();

  if (
    !canActivate({
      verified: domain.status === "verified" || domain.status === "active",
      sslStatus: domain.sslStatus,
    })
  ) {
    throw new DomainNotReadyToActivateError();
  }

  const updated = await prisma.studioDomain.update({
    where: { id: domainId },
    data: { status: "active", activatedAt: new Date(), updatedBy: actorId },
  });

  await writeAuditLog({ studioId, actorId, action: "domain.activated", resourceId: domainId });
  return updated;
}

/** Sets a domain as primary for its purpose, unsetting any previous primary for that (studio, purpose) pair. */
export async function setPrimaryDomain(domainId: string, studioId: string, actorId: string) {
  const domain = await prisma.studioDomain.findFirst({ where: { id: domainId, studioId, deletedAt: null } });
  if (!domain) throw new DomainNotFoundError();

  await prisma.$transaction([
    prisma.studioDomain.updateMany({
      where: { studioId, purpose: domain.purpose, isPrimary: true, id: { not: domainId } },
      data: { isPrimary: false },
    }),
    prisma.studioDomain.update({ where: { id: domainId }, data: { isPrimary: true, updatedBy: actorId } }),
  ]);

  await writeAuditLog({
    studioId,
    actorId,
    action: "domain.set_primary",
    resourceId: domainId,
    metadata: { purpose: domain.purpose },
  });
}

export async function removeDomain(domainId: string, studioId: string, actorId: string) {
  const domain = await prisma.studioDomain.findFirst({ where: { id: domainId, studioId, deletedAt: null } });
  if (!domain) throw new DomainNotFoundError();

  await prisma.studioDomain.update({
    where: { id: domainId },
    data: { deletedAt: new Date(), status: "suspended", isPrimary: false, updatedBy: actorId },
  });

  await writeAuditLog({
    studioId,
    actorId,
    action: "domain.removed",
    resourceId: domainId,
    metadata: { domain: domain.domain },
  });
}

export async function listDomains(studioId: string) {
  return prisma.studioDomain.findMany({ where: { studioId, deletedAt: null }, orderBy: { createdAt: "asc" } });
}

export async function listDomainAuditLog(studioId: string, domainId?: string) {
  return prisma.auditLog.findMany({
    where: { studioId, resourceType: "StudioDomain", resourceId: domainId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
