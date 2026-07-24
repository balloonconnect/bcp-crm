import QRCode from "qrcode";
import { prisma } from "@bcp/database";
import { checkCheckoutConflict } from "@bcp/equipment";
import { recordActivity } from "./activity-log.service";
import { EquipmentNotFoundError } from "./equipment.service";

export class EquipmentDoubleBookedError extends Error {
  readonly code = "EQUIPMENT_DOUBLE_BOOKED";
  constructor(public readonly conflictingCheckoutIds: string[]) {
    super("This equipment is already checked out for the requested window, and no more units are free.");
    this.name = "EquipmentDoubleBookedError";
  }
}

export async function listCheckouts(studioId: string, equipmentId: string) {
  return prisma.equipmentCheckoutRecord.findMany({ where: { studioId, equipmentId }, include: { checkedOutBy: { select: { id: true, name: true } } }, orderBy: { checkedOutAt: "desc" } });
}

/**
 * Prevents equipment double-booking for the checkout flow — the one
 * hard requirement in the brief. Reuses `@bcp/equipment`'s
 * `checkCheckoutConflict()` (same "only conflicts once concurrent
 * demand exceeds owned quantity" logic as the per-event booking
 * conflict check from Prompt 18) rather than a bespoke check, so both
 * flows agree on what "double-booked" means.
 */
export async function checkOutEquipment(studioId: string, equipmentId: string, input: { eventId?: string; expectedReturnAt?: string; conditionAtCheckout?: string; notes?: string }, actorId: string) {
  const equipment = await prisma.equipment.findFirst({ where: { id: equipmentId, studioId } });
  if (!equipment) throw new EquipmentNotFoundError();

  const openCheckouts = await prisma.equipmentCheckoutRecord.findMany({ where: { studioId, equipmentId, checkedInAt: null }, select: { id: true, checkedOutAt: true, expectedReturnAt: true, checkedInAt: true } });

  const conflict = checkCheckoutConflict(
    { equipmentId, requestedFrom: new Date(), requestedUntil: input.expectedReturnAt ? new Date(input.expectedReturnAt) : null, ownedQuantity: equipment.quantity },
    openCheckouts,
  );
  if (conflict.hasConflict) throw new EquipmentDoubleBookedError(conflict.conflictingCheckoutIds);

  const checkout = await prisma.equipmentCheckoutRecord.create({
    data: {
      studioId,
      equipmentId,
      eventId: input.eventId,
      checkedOutByUserId: actorId,
      expectedReturnAt: input.expectedReturnAt ? new Date(input.expectedReturnAt) : undefined,
      conditionAtCheckout: (input.conditionAtCheckout as never) ?? equipment.condition,
      notes: input.notes,
    },
  });

  await prisma.equipment.updateMany({ where: { id: equipmentId, studioId }, data: { currentStatus: "checked_out" } });
  await recordActivity({ studioId, actorId, action: "equipment.checked_out", resourceType: "Equipment", resourceId: equipmentId });

  return checkout;
}

export async function checkInEquipment(studioId: string, checkoutId: string, input: { conditionAtCheckin?: string; notes?: string }, actorId: string) {
  const checkout = await prisma.equipmentCheckoutRecord.findFirst({ where: { id: checkoutId, studioId } });
  if (!checkout) throw new EquipmentNotFoundError();

  await prisma.equipmentCheckoutRecord.updateMany({ where: { id: checkoutId, studioId }, data: { checkedInAt: new Date(), conditionAtCheckin: input.conditionAtCheckin as never, notes: input.notes } });

  const stillOut = await prisma.equipmentCheckoutRecord.count({ where: { studioId, equipmentId: checkout.equipmentId, checkedInAt: null, id: { not: checkoutId } } });
  if (stillOut === 0) {
    await prisma.equipment.updateMany({ where: { id: checkout.equipmentId, studioId }, data: { currentStatus: "available", condition: (input.conditionAtCheckin as never) ?? undefined } });
  }

  await recordActivity({ studioId, actorId, action: "equipment.checked_in", resourceType: "Equipment", resourceId: checkout.equipmentId });
  return prisma.equipmentCheckoutRecord.findUnique({ where: { id: checkoutId } });
}

/** The printable QR code — encodes a public-ish deep link resolved by `qrCodeToken` (not the equipment's UUID directly, so the printed label doesn't leak an internal database ID). */
export async function generateEquipmentQrCode(studioId: string, equipmentId: string): Promise<Buffer> {
  const equipment = await prisma.equipment.findFirst({ where: { id: equipmentId, studioId }, select: { qrCodeToken: true } });
  if (!equipment) throw new EquipmentNotFoundError();

  const baseUrl = process.env.PUBLIC_FORM_BASE_URL ?? "http://localhost:3002";
  const url = `${baseUrl.replace(/\/$/, "")}/equipment/scan/${equipment.qrCodeToken}`;
  return QRCode.toBuffer(url, { margin: 1, width: 400 });
}

export async function resolveEquipmentByQrToken(studioId: string, qrCodeToken: string) {
  const equipment = await prisma.equipment.findFirst({ where: { studioId, qrCodeToken } });
  if (!equipment) throw new EquipmentNotFoundError();
  return equipment;
}
