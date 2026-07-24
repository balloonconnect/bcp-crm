import { prisma } from "@bcp/database";
import { buildCustomerFacingPackageView, computeInternalPackageCost, computePackageMargin, validatePaymentScheduleTotal, type PackageForView } from "@bcp/catalog";
import { recordActivity } from "./activity-log.service";

export class PackageNotFoundError extends Error {
  readonly code = "PACKAGE_NOT_FOUND";
  constructor() {
    super("Package not found");
    this.name = "PackageNotFoundError";
  }
}

export class InvalidPaymentScheduleError extends Error {
  readonly code = "INVALID_PAYMENT_SCHEDULE";
  constructor(public readonly total: number) {
    super(`Payment schedule percentages must sum to 100 (currently ${total}).`);
    this.name = "InvalidPaymentScheduleError";
  }
}

const packageInclude = { packageServices: { include: { service: true } }, addOns: true, paymentSchedule: { orderBy: { order: "asc" as const } } };

export async function listPackages(studioId: string, includeInactive = false) {
  return prisma.package.findMany({
    where: { studioId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    include: packageInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPackage(studioId: string, packageId: string) {
  const pkg = await prisma.package.findFirst({ where: { id: packageId, studioId, deletedAt: null }, include: packageInclude });
  if (!pkg) throw new PackageNotFoundError();
  return pkg;
}

export interface PackageInput {
  name: string;
  eventType: string;
  description?: string;
  customerFacingTotal: number;
  itemLevelPricingEnabled?: boolean;
  durationLabel?: string;
  teamRequirement?: string;
  deliverables?: string[];
  taxRatePercent?: number;
  taxInclusive?: boolean;
  discountAllowed?: boolean;
  maxDiscountPercent?: number;
  termsText?: string;
  isActive?: boolean;
  services?: { serviceId: string; quantity: number }[];
  addOns?: { name: string; price: number; description?: string }[];
  paymentSchedule?: { label: string; percentage: number; trigger?: string; customDays?: number }[];
}

function scalarFields(input: PackageInput) {
  const scalars = { ...input };
  delete scalars.services;
  delete scalars.addOns;
  delete scalars.paymentSchedule;
  return scalars;
}

export async function createPackage(studioId: string, input: PackageInput, actorId: string) {
  if (input.paymentSchedule) {
    const check = validatePaymentScheduleTotal(input.paymentSchedule);
    if (!check.valid) throw new InvalidPaymentScheduleError(check.total);
  }

  // Snapshot each included service's current internal price at build time — see PackageService's schema doc for why.
  const serviceRows = input.services?.length
    ? await prisma.service.findMany({ where: { id: { in: input.services.map((s) => s.serviceId) }, studioId }, select: { id: true, internalPrice: true } })
    : [];
  const priceById = new Map(serviceRows.map((s: { id: string; internalPrice: number }) => [s.id, s.internalPrice]));

  const pkg = await prisma.package.create({
    data: {
      studioId,
      ...scalarFields(input),
      deliverables: input.deliverables ?? [],
      createdBy: actorId,
      packageServices: input.services?.length
        ? { create: input.services.map((s) => ({ serviceId: s.serviceId, quantity: s.quantity, internalPriceSnapshot: priceById.get(s.serviceId) ?? 0 })) }
        : undefined,
      addOns: input.addOns?.length ? { create: input.addOns } : undefined,
      paymentSchedule: input.paymentSchedule?.length
        ? { create: input.paymentSchedule.map((p, i) => ({ label: p.label, percentage: p.percentage, trigger: (p.trigger as never) ?? "on_booking", customDays: p.customDays, order: i })) }
        : undefined,
    },
    include: packageInclude,
  });

  await recordActivity({ studioId, actorId, action: "package.created", resourceType: "Package", resourceId: pkg.id, metadata: { name: pkg.name } });

  return pkg;
}

export async function updatePackage(studioId: string, packageId: string, input: Partial<PackageInput>, actorId: string) {
  const existing = await prisma.package.findFirst({ where: { id: packageId, studioId, deletedAt: null } });
  if (!existing) throw new PackageNotFoundError();

  if (input.paymentSchedule) {
    const check = validatePaymentScheduleTotal(input.paymentSchedule);
    if (!check.valid) throw new InvalidPaymentScheduleError(check.total);
  }

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.package.updateMany({ where: { id: packageId, studioId }, data: scalarFields(input as PackageInput) });

    if (input.services) {
      const serviceRows = input.services.length ? await tx.service.findMany({ where: { id: { in: input.services.map((s) => s.serviceId) }, studioId }, select: { id: true, internalPrice: true } }) : [];
      const priceById = new Map(serviceRows.map((s: { id: string; internalPrice: number }) => [s.id, s.internalPrice]));
      await tx.packageService.deleteMany({ where: { packageId } });
      if (input.services.length) {
        await tx.packageService.createMany({ data: input.services.map((s) => ({ packageId, serviceId: s.serviceId, quantity: s.quantity, internalPriceSnapshot: priceById.get(s.serviceId) ?? 0 })) });
      }
    }

    if (input.addOns) {
      await tx.packageAddOn.deleteMany({ where: { packageId } });
      if (input.addOns.length) await tx.packageAddOn.createMany({ data: input.addOns.map((a) => ({ packageId, ...a })) });
    }

    if (input.paymentSchedule) {
      await tx.packagePaymentScheduleItem.deleteMany({ where: { packageId } });
      if (input.paymentSchedule.length) {
        await tx.packagePaymentScheduleItem.createMany({
          data: input.paymentSchedule.map((p, i) => ({ packageId, label: p.label, percentage: p.percentage, trigger: (p.trigger as never) ?? "on_booking", customDays: p.customDays, order: i })),
        });
      }
    }
  });

  await recordActivity({ studioId, actorId, action: "package.updated", resourceType: "Package", resourceId: packageId });

  return getPackage(studioId, packageId);
}

export async function deletePackage(studioId: string, packageId: string, actorId: string) {
  await prisma.package.updateMany({ where: { id: packageId, studioId }, data: { deletedAt: new Date(), isActive: false } });
  await recordActivity({ studioId, actorId, action: "package.deleted", resourceType: "Package", resourceId: packageId });
}

function toViewModel(pkg: Awaited<ReturnType<typeof getPackage>>): PackageForView {
  return {
    name: pkg.name,
    eventType: pkg.eventType,
    description: pkg.description,
    customerFacingTotal: pkg.customerFacingTotal,
    itemLevelPricingEnabled: pkg.itemLevelPricingEnabled,
    durationLabel: pkg.durationLabel,
    teamRequirement: pkg.teamRequirement,
    deliverables: pkg.deliverables,
    taxRatePercent: pkg.taxRatePercent,
    taxInclusive: pkg.taxInclusive,
    discountAllowed: pkg.discountAllowed,
    maxDiscountPercent: pkg.maxDiscountPercent,
    termsText: pkg.termsText,
    services: pkg.packageServices.map((ps: { service: { name: string }; quantity: number; internalPriceSnapshot: number }) => ({
      name: ps.service.name,
      quantity: ps.quantity,
      internalPriceSnapshot: ps.internalPriceSnapshot,
    })),
    addOns: pkg.addOns.map((a: { name: string; price: number; description: string | null }) => ({ name: a.name, price: a.price, description: a.description ?? undefined })),
    paymentSchedule: pkg.paymentSchedule.map((p: { label: string; percentage: number; trigger: string }) => ({ label: p.label, percentage: p.percentage, trigger: p.trigger })),
  };
}

/** The only sanctioned way to get a customer-safe representation of a package — see `@bcp/catalog`'s `buildCustomerFacingPackageView` doc comment for why this matters. Every quotation/PDF/WhatsApp/client-portal renderer should call this, never read `packageServices` directly. */
export async function getCustomerFacingPackageView(studioId: string, packageId: string) {
  const pkg = await getPackage(studioId, packageId);
  return buildCustomerFacingPackageView(toViewModel(pkg));
}

/** Studio-only — internal cost and margin. Never exposed on any customer-facing endpoint. */
export async function getPackageMargin(studioId: string, packageId: string) {
  const pkg = await getPackage(studioId, packageId);
  const internalCost = computeInternalPackageCost(pkg.packageServices.map((ps: { internalPriceSnapshot: number; quantity: number }) => ps));
  return computePackageMargin(internalCost, pkg.customerFacingTotal);
}
