import { prisma } from "@bcp/database";
import { recordActivity } from "./activity-log.service";

// ── Maintenance ──────────────────────────────────────────────────────

export async function addMaintenanceRecord(studioId: string, equipmentId: string, input: { maintenanceType?: string; performedAt: string; description?: string; cost?: number; performedBy?: string; nextDueAt?: string }, actorId: string) {
  const record = await prisma.equipmentMaintenanceRecord.create({
    data: { studioId, equipmentId, maintenanceType: (input.maintenanceType as never) ?? "routine", performedAt: new Date(input.performedAt), description: input.description, cost: input.cost, performedBy: input.performedBy, nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : undefined, createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "equipment.maintenance_logged", resourceType: "Equipment", resourceId: equipmentId });
  return record;
}

// ── Repairs ──────────────────────────────────────────────────────────

export async function reportRepair(studioId: string, equipmentId: string, input: { issueDescription: string; vendor?: string; cost?: number }, actorId: string) {
  const record = await prisma.equipmentRepairRecord.create({ data: { studioId, equipmentId, issueDescription: input.issueDescription, vendor: input.vendor, cost: input.cost, createdBy: actorId } });
  await prisma.equipment.updateMany({ where: { id: equipmentId, studioId }, data: { currentStatus: "in_repair" } });
  await recordActivity({ studioId, actorId, action: "equipment.repair_reported", resourceType: "Equipment", resourceId: equipmentId });
  return record;
}

export async function updateRepairStatus(studioId: string, repairId: string, status: string, actorId: string) {
  const data: Record<string, unknown> = { status };
  if (status === "resolved" || status === "unrepairable") data.resolvedAt = new Date();

  const repair = await prisma.equipmentRepairRecord.findFirst({ where: { id: repairId, studioId } });
  await prisma.equipmentRepairRecord.updateMany({ where: { id: repairId, studioId }, data });

  if (repair && (status === "resolved")) {
    await prisma.equipment.updateMany({ where: { id: repair.equipmentId, studioId }, data: { currentStatus: "available" } });
  }

  await recordActivity({ studioId, actorId, action: "equipment.repair_status_changed", resourceType: "EquipmentRepairRecord", resourceId: repairId, metadata: { status } });
  return prisma.equipmentRepairRecord.findUnique({ where: { id: repairId } });
}

// ── Rentals ──────────────────────────────────────────────────────────

export async function addRentalRecord(studioId: string, equipmentId: string, input: { direction: string; counterpartyName: string; startDate: string; endDate: string; cost?: number; notes?: string }, actorId: string) {
  const record = await prisma.equipmentRentalRecord.create({
    data: { studioId, equipmentId, direction: input.direction as never, counterpartyName: input.counterpartyName, startDate: new Date(input.startDate), endDate: new Date(input.endDate), cost: input.cost, notes: input.notes, createdBy: actorId },
  });
  await recordActivity({ studioId, actorId, action: "equipment.rental_logged", resourceType: "Equipment", resourceId: equipmentId, metadata: { direction: input.direction } });
  return record;
}

// ── Damage reports ───────────────────────────────────────────────────

export async function reportDamage(studioId: string, equipmentId: string, input: { severity?: string; description: string; photoKeys?: string[]; repairCost?: number }, actorId: string) {
  const report = await prisma.equipmentDamageReport.create({
    data: { studioId, equipmentId, severity: (input.severity as never) ?? "minor", description: input.description, photoKeys: input.photoKeys ?? [], repairCost: input.repairCost, reportedBy: actorId },
  });
  await prisma.equipment.updateMany({ where: { id: equipmentId, studioId }, data: { condition: "damaged" } });
  await recordActivity({ studioId, actorId, action: "equipment.damage_reported", resourceType: "Equipment", resourceId: equipmentId, metadata: { severity: input.severity } });
  return report;
}

export async function resolveDamageReport(studioId: string, reportId: string, actorId: string) {
  await prisma.equipmentDamageReport.updateMany({ where: { id: reportId, studioId }, data: { resolvedAt: new Date() } });
  await recordActivity({ studioId, actorId, action: "equipment.damage_resolved", resourceType: "EquipmentDamageReport", resourceId: reportId });
  return prisma.equipmentDamageReport.findUnique({ where: { id: reportId } });
}
