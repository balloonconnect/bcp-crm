import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

export class VendorNotFoundError extends Error {
  readonly code = "VENDOR_NOT_FOUND";
  constructor() {
    super("Vendor not found");
    this.name = "VendorNotFoundError";
  }
}

export async function listVendors(studioId: string, includeInactive = false) {
  return prisma.vendor.findMany({ where: { studioId, ...(includeInactive ? {} : { isActive: true }) }, orderBy: { name: "asc" } });
}

export async function getVendor(studioId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, studioId },
    include: { purchaseOrders: { orderBy: { createdAt: "desc" }, take: 20 }, bills: { orderBy: { billDate: "desc" }, take: 20 } },
  });
  if (!vendor) throw new VendorNotFoundError();
  return vendor;
}

export interface VendorInput {
  name: string;
  category?: string;
  contactPersonName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  gstin?: string;
  paymentTerms?: string;
  notes?: string;
}

export async function createVendor(studioId: string, input: VendorInput, actorId: string) {
  const vendor = await prisma.vendor.create({ data: { studioId, ...input, createdBy: actorId } });
  await recordActivity({ studioId, actorId, action: "vendor.created", resourceType: "Vendor", resourceId: vendor.id, metadata: { name: vendor.name } });
  return vendor;
}

export async function updateVendor(studioId: string, vendorId: string, input: Partial<VendorInput>, actorId: string) {
  const existing = await prisma.vendor.findFirst({ where: { id: vendorId, studioId } });
  if (!existing) throw new VendorNotFoundError();

  await prisma.vendor.updateMany({ where: { id: vendorId, studioId }, data: input });
  await recordActivity({ studioId, actorId, action: "vendor.updated", resourceType: "Vendor", resourceId: vendorId });
  return prisma.vendor.findUnique({ where: { id: vendorId } });
}

export async function deactivateVendor(studioId: string, vendorId: string, actorId: string) {
  await prisma.vendor.updateMany({ where: { id: vendorId, studioId }, data: { isActive: false } });
  await recordActivity({ studioId, actorId, action: "vendor.deactivated", resourceType: "Vendor", resourceId: vendorId });
}

// ── Cost centres ─────────────────────────────────────────────────────

export async function listCostCentres(studioId: string) {
  return prisma.costCentre.findMany({ where: { studioId, isActive: true }, orderBy: { name: "asc" } });
}

export async function createCostCentre(studioId: string, input: { name: string; description?: string }, actorId: string) {
  const costCentre = await prisma.costCentre.create({ data: { studioId, ...input } });
  await recordActivity({ studioId, actorId, action: "cost_centre.created", resourceType: "CostCentre", resourceId: costCentre.id, metadata: { name: costCentre.name } });
  return costCentre;
}
