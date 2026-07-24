import { prisma } from "@bcp/database";
import { generateOpaqueToken } from "@bcp/auth";
import { canRenew } from "@bcp/billing";

async function writePlatformAuditLog(input: {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  studioId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      studioId: input.studioId,
      actorType: "platform_user",
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}

// ── Plans module ─────────────────────────────────────────────────────────

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } });
}

export async function updatePlan(
  planId: string,
  updates: Partial<{ isActive: boolean; priceMonthly: number; priceYearly: number }>,
  actorId: string,
) {
  const updated = await prisma.subscriptionPlan.update({ where: { id: planId }, data: updates });
  await writePlatformAuditLog({
    actorId,
    action: "plan.updated",
    resourceType: "SubscriptionPlan",
    resourceId: planId,
    metadata: updates,
  });
  return updated;
}

// ── Subscriptions module ────────────────────────────────────────────────

export async function listSubscriptions(
  input: { studioId?: string; status?: string; page?: number; pageSize?: number } = {},
) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);
  const where = {
    ...(input.studioId ? { studioId: input.studioId } : {}),
    ...(input.status ? { status: input.status as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { studio: { select: { name: true, slug: true } }, plan: { select: { key: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.subscription.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

// ── Licenses module ──────────────────────────────────────────────────────

function generateLicenseKey(): string {
  return `bcp_lic_${generateOpaqueToken(16)}`;
}

export async function issueLicense(input: {
  studioId: string;
  subscriptionId?: string;
  tier: string;
  seatsAllowed?: number;
  maxActivations?: number;
  validForDays?: number;
  actorId: string;
}) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + (input.validForDays ?? 365) * 24 * 60 * 60 * 1000);

  const license = await prisma.licenseKey.create({
    data: {
      studioId: input.studioId,
      subscriptionId: input.subscriptionId,
      key: generateLicenseKey(),
      tier: input.tier,
      status: "active",
      issuedAt,
      expiresAt,
      seatsAllowed: input.seatsAllowed ?? 1,
      maxActivations: input.maxActivations ?? 1,
      createdBy: input.actorId,
    },
  });

  await writePlatformAuditLog({
    actorId: input.actorId,
    action: "license.issued",
    resourceType: "LicenseKey",
    resourceId: license.id,
    studioId: input.studioId,
    metadata: { tier: input.tier, expiresAt },
  });

  return license;
}

export class LicenseNotFoundError extends Error {
  readonly code = "LICENSE_NOT_FOUND";
  constructor() {
    super("License key not found");
    this.name = "LicenseNotFoundError";
  }
}

export async function revokeLicense(licenseId: string, actorId: string, reason: string) {
  const license = await prisma.licenseKey.findUnique({ where: { id: licenseId } });
  if (!license) throw new LicenseNotFoundError();

  const updated = await prisma.licenseKey.update({
    where: { id: licenseId },
    data: { status: "revoked", revokedAt: new Date(), revokedReason: reason, updatedBy: actorId },
  });

  await writePlatformAuditLog({
    actorId,
    action: "license.revoked",
    resourceType: "LicenseKey",
    resourceId: licenseId,
    studioId: license.studioId,
    metadata: { reason },
  });

  return updated;
}

export async function suspendLicense(licenseId: string, actorId: string, reason: string) {
  const license = await prisma.licenseKey.findUnique({ where: { id: licenseId } });
  if (!license) throw new LicenseNotFoundError();

  const updated = await prisma.licenseKey.update({
    where: { id: licenseId },
    data: { status: "suspended", updatedBy: actorId },
  });

  await writePlatformAuditLog({
    actorId,
    action: "license.suspended",
    resourceType: "LicenseKey",
    resourceId: licenseId,
    studioId: license.studioId,
    metadata: { reason },
  });

  return updated;
}

export async function reinstateLicense(licenseId: string, actorId: string) {
  const license = await prisma.licenseKey.findUnique({ where: { id: licenseId } });
  if (!license) throw new LicenseNotFoundError();

  const updated = await prisma.licenseKey.update({
    where: { id: licenseId },
    data: { status: "active", updatedBy: actorId },
  });

  await writePlatformAuditLog({
    actorId,
    action: "license.reinstated",
    resourceType: "LicenseKey",
    resourceId: licenseId,
    studioId: license.studioId,
  });

  return updated;
}

/**
 * Renews a license: issues a **new** LicenseKey row for a fresh one-year
 * term rather than mutating `expiresAt` on the old one — see
 * packages/database/docs/tenant-isolation.md § "One-year licenses" for
 * why a license key, once issued, stays an immutable record of the term
 * it covered. The old key is left as-is (its own status/expiry keep
 * telling the truth about that term); only the new row is "current."
 */
export async function renewLicense(licenseId: string, actorId: string, validForDays = 365) {
  const previous = await prisma.licenseKey.findUnique({ where: { id: licenseId } });
  if (!previous) throw new LicenseNotFoundError();

  if (!canRenew({ status: previous.status, expiresAt: previous.expiresAt, graceEndsAt: previous.graceEndsAt })) {
    throw new LicenseNotRenewableError();
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + validForDays * 24 * 60 * 60 * 1000);

  const renewed = await prisma.licenseKey.create({
    data: {
      studioId: previous.studioId,
      subscriptionId: previous.subscriptionId,
      key: generateLicenseKey(),
      tier: previous.tier,
      status: "active",
      issuedAt,
      expiresAt,
      seatsAllowed: previous.seatsAllowed,
      maxActivations: previous.maxActivations,
      allowedDomains: previous.allowedDomains,
      createdBy: actorId,
    },
  });

  await writePlatformAuditLog({
    actorId,
    action: "license.renewed",
    resourceType: "LicenseKey",
    resourceId: renewed.id,
    studioId: previous.studioId,
    metadata: { previousLicenseId: previous.id, expiresAt },
  });

  return renewed;
}

export class LicenseNotRenewableError extends Error {
  readonly code = "LICENSE_NOT_RENEWABLE";
  constructor() {
    super("This license is not yet eligible for renewal, or has been revoked");
    this.name = "LicenseNotRenewableError";
  }
}

export async function listLicenses(
  input: { studioId?: string; status?: string; page?: number; pageSize?: number } = {},
) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);
  const where = {
    ...(input.studioId ? { studioId: input.studioId } : {}),
    ...(input.status ? { status: input.status as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.licenseKey.findMany({
      where,
      include: { studio: { select: { name: true, slug: true } } },
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.licenseKey.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

// ── Activations module ───────────────────────────────────────────────────

export async function listActivations(licenseId: string) {
  return prisma.activation.findMany({ where: { licenseKeyId: licenseId }, orderBy: { activatedAt: "desc" } });
}

export async function deactivateActivation(activationId: string, actorId: string) {
  const activation = await prisma.activation.findUnique({ where: { id: activationId } });
  if (!activation) throw new LicenseNotFoundError();

  const updated = await prisma.activation.update({
    where: { id: activationId },
    data: { status: "deactivated", deactivatedAt: new Date() },
  });

  await writePlatformAuditLog({
    actorId,
    action: "activation.deactivated",
    resourceType: "Activation",
    resourceId: activationId,
    studioId: activation.studioId,
  });

  return updated;
}

// ── Payments module ──────────────────────────────────────────────────────

export async function listPayments(
  input: { studioId?: string; status?: string; page?: number; pageSize?: number } = {},
) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);
  const where = {
    ...(input.studioId ? { studioId: input.studioId } : {}),
    ...(input.status ? { status: input.status as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { studio: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, page, pageSize, total };
}
