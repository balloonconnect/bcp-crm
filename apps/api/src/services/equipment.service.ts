import { prisma } from "@bcp/database";
import { computeEquipmentValuation, findExpiringEquipment } from "@bcp/equipment";
import { recordActivity } from "./activity-log.service";

export class EquipmentNotFoundError extends Error {
  readonly code = "EQUIPMENT_NOT_FOUND";
  constructor() {
    super("Equipment not found");
    this.name = "EquipmentNotFoundError";
  }
}

const equipmentInclude = {
  maintenanceRecords: { orderBy: { performedAt: "desc" as const }, take: 20 },
  repairRecords: { orderBy: { reportedAt: "desc" as const }, take: 20 },
  rentalRecords: { orderBy: { startDate: "desc" as const }, take: 20 },
  damageReports: { orderBy: { reportedAt: "desc" as const }, take: 20 },
  checkoutRecords: { orderBy: { checkedOutAt: "desc" as const }, take: 20, include: { checkedOutBy: { select: { id: true, name: true } } } },
  teamAssignments: { where: { returnedAt: null }, include: { studioUser: { select: { id: true, name: true } } } },
};

export async function listEquipment(studioId: string, includeInactive = false) {
  return prisma.equipment.findMany({ where: { studioId, ...(includeInactive ? {} : { isActive: true }) }, orderBy: { name: "asc" } });
}

export async function getEquipment(studioId: string, equipmentId: string) {
  const equipment = await prisma.equipment.findFirst({ where: { id: equipmentId, studioId }, include: equipmentInclude });
  if (!equipment) throw new EquipmentNotFoundError();
  return equipment;
}

export interface EquipmentInput {
  name: string;
  category?: string;
  quantity?: number;
  notes?: string;
  isActive?: boolean;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  replacementCost?: number;
  warrantyExpiresAt?: string;
  insurancePolicyNumber?: string;
  insuranceExpiresAt?: string;
  condition?: string;
}

function toDateFields(input: Partial<EquipmentInput>) {
  return {
    ...input,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
    warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : undefined,
    insuranceExpiresAt: input.insuranceExpiresAt ? new Date(input.insuranceExpiresAt) : undefined,
    condition: input.condition as never,
  };
}

export async function createEquipment(studioId: string, input: EquipmentInput, actorId: string) {
  const equipment = await prisma.equipment.create({ data: { studioId, quantity: input.quantity ?? 1, ...toDateFields(input) } });
  await recordActivity({ studioId, actorId, action: "equipment.created", resourceType: "Equipment", resourceId: equipment.id, metadata: { name: equipment.name } });
  return equipment;
}

export async function updateEquipment(studioId: string, equipmentId: string, input: Partial<EquipmentInput>, actorId: string) {
  const existing = await prisma.equipment.findFirst({ where: { id: equipmentId, studioId } });
  if (!existing) throw new EquipmentNotFoundError();

  await prisma.equipment.updateMany({ where: { id: equipmentId, studioId }, data: toDateFields(input) });
  await recordActivity({ studioId, actorId, action: "equipment.updated", resourceType: "Equipment", resourceId: equipmentId });
  return prisma.equipment.findUnique({ where: { id: equipmentId } });
}

export async function deleteEquipment(studioId: string, equipmentId: string, actorId: string) {
  await prisma.equipment.updateMany({ where: { id: equipmentId, studioId }, data: { isActive: false, currentStatus: "retired" } });
  await recordActivity({ studioId, actorId, action: "equipment.retired", resourceType: "Equipment", resourceId: equipmentId });
}

/** The studio-wide "what needs attention" summary — total insured/replacement value plus anything with a warranty or insurance policy expiring soon or already lapsed. Computed live from the full equipment list, same "resolve on read" reasoning as SLA/escalation and payment milestones elsewhere in this codebase. */
export async function getEquipmentOverview(studioId: string) {
  const items = await prisma.equipment.findMany({ where: { studioId, isActive: true }, select: { id: true, name: true, quantity: true, replacementCost: true, purchasePrice: true, warrantyExpiresAt: true, insuranceExpiresAt: true } });

  return {
    valuation: computeEquipmentValuation(items),
    expiringItems: findExpiringEquipment(items),
  };
}
