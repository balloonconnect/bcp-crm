import { prisma } from "@bcp/database";
import { generateOpaqueToken } from "@bcp/auth";
import { computeQuotationTotals, computeQuotationMargin, buildCustomerFacingQuotationView, canTransition, type QuotationStatus } from "@bcp/quotations";
import { recordActivity } from "./activity-log.service";

export class QuotationNotFoundError extends Error {
  readonly code = "QUOTATION_NOT_FOUND";
  constructor() {
    super("Quotation not found");
    this.name = "QuotationNotFoundError";
  }
}

export class InvalidQuotationTransitionError extends Error {
  readonly code = "INVALID_QUOTATION_TRANSITION";
  constructor(from: string, to: string) {
    super(`Cannot move a quotation from "${from}" to "${to}".`);
    this.name = "InvalidQuotationTransitionError";
  }
}

const quotationInclude = { lineItems: { orderBy: { order: "asc" as const } }, paymentSchedule: { orderBy: { order: "asc" as const } } };

async function nextQuotationNumber(studioId: string): Promise<string> {
  const count = await prisma.quotation.count({ where: { studioId } });
  const year = new Date().getFullYear();
  return `Q-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function listQuotations(studioId: string, filter?: { status?: string; clientId?: string }) {
  return prisma.quotation.findMany({
    where: { studioId, ...(filter?.status ? { status: filter.status as never } : {}), ...(filter?.clientId ? { clientId: filter.clientId } : {}) },
    include: quotationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuotation(studioId: string, quotationId: string) {
  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, studioId }, include: quotationInclude });
  if (!quotation) throw new QuotationNotFoundError();
  return quotation;
}

interface LineItemInput {
  kind?: "service" | "add_on";
  serviceId?: string;
  name: string;
  quantity?: number;
  unitPrice: number;
}

export interface QuotationInput {
  clientId?: string;
  leadId?: string;
  eventId?: string;
  branchId?: string;
  packageId?: string;
  lineItems?: LineItemInput[];
  discountType?: "percentage" | "fixed_amount";
  discountValue?: number;
  gstRatePercent?: number;
  itemLevelPricingEnabled?: boolean;
  termsText?: string;
  validUntil?: string;
  paymentSchedule?: { label: string; percentage: number; trigger?: string }[];
}

/** Resolves the actual line items to snapshot — either what the caller specified directly, or (if a packageId was given and no explicit line items) copied from that Package's current composition. Either way, every service line's `internalPrice` is snapshotted from the catalog *now*, at quotation-build time. */
async function resolveLineItems(studioId: string, input: QuotationInput): Promise<{ kind: "service" | "add_on"; name: string; quantity: number; unitPrice: number; internalPrice: number | null; order: number }[]> {
  if (input.lineItems?.length) {
    const serviceIds = input.lineItems.filter((i) => i.serviceId).map((i) => i.serviceId!);
    const services = serviceIds.length ? await prisma.service.findMany({ where: { id: { in: serviceIds }, studioId }, select: { id: true, internalPrice: true } }) : [];
    const priceById = new Map<string, number>(services.map((s: { id: string; internalPrice: number }) => [s.id, s.internalPrice]));

    return input.lineItems.map((item, order) => ({
      kind: item.kind ?? "service",
      name: item.name,
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice,
      internalPrice: item.kind === "add_on" ? null : (item.serviceId ? priceById.get(item.serviceId) ?? null : null),
      order,
    }));
  }

  if (input.packageId) {
    const pkg = await prisma.package.findFirst({
      where: { id: input.packageId, studioId },
      include: { packageServices: { include: { service: true } }, addOns: true },
    });
    if (!pkg) return [];

    const serviceLines = pkg.packageServices.map((ps: { service: { name: string }; quantity: number; internalPriceSnapshot: number }, i: number) => ({
      kind: "service" as const,
      name: ps.service.name,
      quantity: ps.quantity,
      unitPrice: ps.internalPriceSnapshot, // a package's services don't have their own separate customer price — the package's total covers them
      internalPrice: ps.internalPriceSnapshot,
      order: i,
    }));
    const addOnLines = pkg.addOns.map((a: { name: string; price: number }, i: number) => ({
      kind: "add_on" as const,
      name: a.name,
      quantity: 1,
      unitPrice: a.price,
      internalPrice: null,
      order: serviceLines.length + i,
    }));
    return [...serviceLines, ...addOnLines];
  }

  return [];
}

async function buildRevisionSnapshot(quotationId: string) {
  return prisma.quotation.findUnique({ where: { id: quotationId }, include: quotationInclude });
}

async function saveRevision(studioId: string, quotationId: string, actorId: string, changeSummary: string) {
  const snapshot = await buildRevisionSnapshot(quotationId);
  const lastRevision = await prisma.quotationRevision.findFirst({ where: { quotationId }, orderBy: { revisionNumber: "desc" } });
  const revisionNumber = (lastRevision?.revisionNumber ?? 0) + 1;

  await prisma.quotationRevision.create({
    data: { studioId, quotationId, revisionNumber, snapshot: snapshot as never, changeSummary, createdBy: actorId },
  });
}

export async function createQuotation(studioId: string, input: QuotationInput, actorId: string) {
  const lineItems = await resolveLineItems(studioId, input);
  const totals = computeQuotationTotals(
    lineItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, internalPrice: i.internalPrice })),
    input.discountType && input.discountValue !== undefined ? { type: input.discountType, value: input.discountValue } : null,
    input.gstRatePercent ?? 0,
  );

  let itemLevelPricingEnabled = input.itemLevelPricingEnabled ?? false;
  if (input.packageId && input.itemLevelPricingEnabled === undefined) {
    const pkg = await prisma.package.findFirst({ where: { id: input.packageId, studioId }, select: { itemLevelPricingEnabled: true } });
    itemLevelPricingEnabled = pkg?.itemLevelPricingEnabled ?? false;
  }

  const quotationNumber = await nextQuotationNumber(studioId);

  const quotation = await prisma.quotation.create({
    data: {
      studioId,
      clientId: input.clientId,
      leadId: input.leadId,
      eventId: input.eventId,
      branchId: input.branchId,
      packageId: input.packageId,
      quotationNumber,
      subtotal: totals.subtotal,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: totals.discountAmount,
      gstRatePercent: input.gstRatePercent ?? 0,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      internalCost: totals.internalCost,
      itemLevelPricingEnabled,
      termsText: input.termsText,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      publicToken: generateOpaqueToken(20),
      createdBy: actorId,
      lineItems: lineItems.length ? { create: lineItems } : undefined,
      paymentSchedule: input.paymentSchedule?.length
        ? { create: input.paymentSchedule.map((p, i) => ({ label: p.label, percentage: p.percentage, amount: Math.round((totals.totalAmount * p.percentage) / 100), trigger: (p.trigger as never) ?? "on_booking", order: i })) }
        : undefined,
    },
    include: quotationInclude,
  });

  await saveRevision(studioId, quotation.id, actorId, "Quotation created");
  await recordActivity({ studioId, actorId, action: "quotation.created", resourceType: "Quotation", resourceId: quotation.id, metadata: { quotationNumber, totalAmount: quotation.totalAmount } });

  if (input.leadId) {
    await prisma.lead.updateMany({ where: { id: input.leadId, studioId }, data: { status: "quotation_sent" } });
  }

  return quotation;
}

export async function updateQuotation(studioId: string, quotationId: string, input: Partial<QuotationInput>, actorId: string) {
  const existing = await getQuotation(studioId, quotationId);

  type ResolvedLineItem = { kind: "service" | "add_on"; name: string; quantity: number; unitPrice: number; internalPrice: number | null; order: number };
  const lineItems: ResolvedLineItem[] = input.lineItems || input.packageId
    ? await resolveLineItems(studioId, input as QuotationInput)
    : existing.lineItems.map((i: ResolvedLineItem) => i);

  const totals = computeQuotationTotals(
    lineItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, internalPrice: i.internalPrice })),
    (input.discountType ?? existing.discountType) && (input.discountValue ?? existing.discountValue) !== undefined
      ? { type: (input.discountType ?? existing.discountType) as "percentage" | "fixed_amount", value: (input.discountValue ?? existing.discountValue) as number }
      : null,
    input.gstRatePercent ?? existing.gstRatePercent,
  );

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.quotation.updateMany({
      where: { id: quotationId, studioId },
      data: {
        clientId: input.clientId,
        leadId: input.leadId,
        eventId: input.eventId,
        branchId: input.branchId,
        packageId: input.packageId,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        gstRatePercent: input.gstRatePercent,
        gstAmount: totals.gstAmount,
        totalAmount: totals.totalAmount,
        internalCost: totals.internalCost,
        itemLevelPricingEnabled: input.itemLevelPricingEnabled,
        termsText: input.termsText,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      },
    });

    if (input.lineItems || input.packageId) {
      await tx.quotationLineItem.deleteMany({ where: { quotationId } });
      if (lineItems.length) await tx.quotationLineItem.createMany({ data: lineItems.map((i) => ({ quotationId, ...i })) });
    }

    if (input.paymentSchedule) {
      await tx.quotationPaymentScheduleItem.deleteMany({ where: { quotationId } });
      if (input.paymentSchedule.length) {
        await tx.quotationPaymentScheduleItem.createMany({
          data: input.paymentSchedule.map((p, i) => ({ quotationId, label: p.label, percentage: p.percentage, amount: Math.round((totals.totalAmount * p.percentage) / 100), trigger: (p.trigger as never) ?? "on_booking", order: i })),
        });
      }
    }
  });

  await saveRevision(studioId, quotationId, actorId, "Quotation updated");
  await recordActivity({ studioId, actorId, action: "quotation.updated", resourceType: "Quotation", resourceId: quotationId });

  return getQuotation(studioId, quotationId);
}

export async function changeQuotationStatus(studioId: string, quotationId: string, status: QuotationStatus, actorId: string) {
  const existing = await getQuotation(studioId, quotationId);
  if (!canTransition(existing.status as QuotationStatus, status)) {
    throw new InvalidQuotationTransitionError(existing.status, status);
  }

  const data: Record<string, unknown> = { status };
  if (status === "accepted" || status === "rejected") data.respondedAt = new Date();
  if (status === "sent" && existing.status === "expired") data.validUntil = null; // re-sending clears a stale expiry; the studio sets a new one via update

  await prisma.quotation.updateMany({ where: { id: quotationId, studioId }, data });
  await recordActivity({ studioId, actorId, action: "quotation.status_changed", resourceType: "Quotation", resourceId: quotationId, metadata: { status } });

  return getQuotation(studioId, quotationId);
}

export async function cloneQuotation(studioId: string, quotationId: string, actorId: string) {
  const source = await getQuotation(studioId, quotationId);
  const quotationNumber = await nextQuotationNumber(studioId);

  const clone = await prisma.quotation.create({
    data: {
      studioId,
      clientId: source.clientId,
      leadId: source.leadId,
      eventId: source.eventId,
      branchId: source.branchId,
      packageId: source.packageId,
      quotationNumber,
      subtotal: source.subtotal,
      discountType: source.discountType,
      discountValue: source.discountValue,
      discountAmount: source.discountAmount,
      gstRatePercent: source.gstRatePercent,
      gstAmount: source.gstAmount,
      totalAmount: source.totalAmount,
      internalCost: source.internalCost,
      itemLevelPricingEnabled: source.itemLevelPricingEnabled,
      termsText: source.termsText,
      publicToken: generateOpaqueToken(20),
      createdBy: actorId,
      lineItems: { create: source.lineItems.map((i: { kind: string; name: string; quantity: number; unitPrice: number; internalPrice: number | null }) => ({ kind: i.kind as never, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, internalPrice: i.internalPrice })) },
      paymentSchedule: { create: source.paymentSchedule.map((p: { label: string; percentage: number; amount: number; trigger: string }) => ({ label: p.label, percentage: p.percentage, amount: p.amount, trigger: p.trigger as never })) },
    },
    include: quotationInclude,
  });

  await saveRevision(studioId, clone.id, actorId, `Cloned from ${source.quotationNumber}`);
  await recordActivity({ studioId, actorId, action: "quotation.cloned", resourceType: "Quotation", resourceId: clone.id, metadata: { sourceQuotationNumber: source.quotationNumber } });

  return clone;
}

export class QuotationNotAcceptedError extends Error {
  readonly code = "QUOTATION_NOT_ACCEPTED";
  constructor() {
    super("Only an accepted quotation can be converted to a booking");
    this.name = "QuotationNotAcceptedError";
  }
}

async function nextBookingNumber(studioId: string): Promise<string> {
  const count = await prisma.booking.count({ where: { studioId } });
  const year = new Date().getFullYear();
  return `B-${year}-${String(count + 1).padStart(4, "0")}`;
}

/**
 * The real conversion: creates a `Booking` — the parent record
 * `docs/booking-management.md` describes — snapshotting the accepted
 * quotation's line items and payment schedule onto it, and creates (or
 * confirms an existing) `Event` linked to the new booking. Returns the
 * quotation with its new `converted` status; the created Booking is
 * fetched separately via `bookings.service.ts`'s `getBookingByQuotationId`.
 */
export async function convertQuotationToBooking(studioId: string, quotationId: string, actorId: string) {
  const quotation = await getQuotation(studioId, quotationId);
  if (quotation.status !== "accepted") throw new QuotationNotAcceptedError();
  if (!quotation.clientId) throw new QuotationNotAcceptedError();

  const bookingNumber = await nextBookingNumber(studioId);

  const event = await prisma.$transaction(async (tx: typeof prisma) => {
    const booking = await tx.booking.create({
      data: {
        studioId,
        branchId: quotation.branchId,
        bookingNumber,
        clientId: quotation.clientId!,
        packageId: quotation.packageId,
        quotationId: quotation.id,
        status: "awaiting_advance",
        internalCost: quotation.internalCost,
        sellingPrice: quotation.totalAmount,
        estimatedProfit: quotation.totalAmount - quotation.internalCost,
        createdBy: actorId,
        lineItems: {
          create: quotation.lineItems.map((i: { kind: string; name: string; quantity: number; unitPrice: number; internalPrice: number | null; order: number }) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            internalPrice: i.internalPrice,
            order: i.order,
          })),
        },
        paymentSchedule: {
          create: quotation.paymentSchedule.map((p: { label: string; percentage: number; amount: number; trigger: string; order: number }) => ({
            label: p.label,
            percentage: p.percentage,
            amount: p.amount,
            order: p.order,
          })),
        },
      },
    });

    let eventRecord = quotation.eventId ? await tx.event.findUnique({ where: { id: quotation.eventId } }) : null;
    if (!eventRecord) {
      eventRecord = await tx.event.create({
        data: {
          studioId,
          branchId: quotation.branchId,
          clientId: quotation.clientId,
          leadId: quotation.leadId,
          bookingId: booking.id,
          title: `Booking ${bookingNumber}`,
          eventType: "general",
          status: "confirmed",
          scheduledAt: quotation.validUntil ?? new Date(),
          createdBy: actorId,
        },
      });
    } else {
      await tx.event.update({ where: { id: eventRecord.id }, data: { status: "confirmed", bookingId: booking.id } });
    }

    await tx.quotation.update({ where: { id: quotationId }, data: { status: "converted", convertedAt: new Date(), eventId: eventRecord.id } });

    if (quotation.leadId) {
      await tx.lead.update({ where: { id: quotation.leadId }, data: { status: "won" } });
    }

    return eventRecord;
  });

  await recordActivity({ studioId, actorId, action: "quotation.converted", resourceType: "Quotation", resourceId: quotationId, metadata: { eventId: event.id, bookingNumber } });

  return getQuotation(studioId, quotationId);
}

export async function getQuotationMargin(studioId: string, quotationId: string) {
  const quotation = await getQuotation(studioId, quotationId);
  return computeQuotationMargin(quotation.internalCost, quotation.totalAmount);
}

function toViewModel(quotation: Awaited<ReturnType<typeof getQuotation>>) {
  return {
    quotationNumber: quotation.quotationNumber,
    status: quotation.status,
    subtotal: quotation.subtotal,
    discountAmount: quotation.discountAmount,
    gstRatePercent: quotation.gstRatePercent,
    gstAmount: quotation.gstAmount,
    totalAmount: quotation.totalAmount,
    itemLevelPricingEnabled: quotation.itemLevelPricingEnabled,
    termsText: quotation.termsText,
    validUntil: quotation.validUntil,
    lineItems: quotation.lineItems.map((i: { kind: string; name: string; quantity: number; unitPrice: number }) => ({ kind: i.kind as "service" | "add_on", name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
    paymentSchedule: quotation.paymentSchedule.map((p: { label: string; percentage: number; amount: number; trigger: string }) => ({ label: p.label, percentage: p.percentage, amount: p.amount, trigger: p.trigger })),
  };
}

/** The only sanctioned way to get a customer-safe view — see `@bcp/quotations`'s `buildCustomerFacingQuotationView` doc comment. Used by the studio-side preview, the PDF generator, the WhatsApp message builder, and the public quotation page alike. */
export async function getCustomerFacingQuotationView(studioId: string, quotationId: string) {
  const quotation = await getQuotation(studioId, quotationId);
  return buildCustomerFacingQuotationView(toViewModel(quotation));
}

export async function listRevisions(studioId: string, quotationId: string) {
  return prisma.quotationRevision.findMany({ where: { studioId, quotationId }, orderBy: { revisionNumber: "desc" } });
}

export async function listQuotationViews(studioId: string, quotationId: string) {
  return prisma.quotationView.findMany({ where: { studioId, quotationId }, orderBy: { viewedAt: "desc" } });
}

export { toViewModel as quotationToViewModel };
