import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  equipmentInputSchema,
  equipmentUpdateSchema,
  maintenanceRecordInputSchema,
  repairRecordInputSchema,
  repairStatusSchema,
  rentalRecordInputSchema,
  damageReportInputSchema,
  checkoutInputSchema,
  checkinInputSchema,
} from "@bcp/equipment";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as equipment from "../services/equipment.service";
import * as equipmentHistory from "../services/equipment-history.service";
import * as equipmentCheckout from "../services/equipment-checkout.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function equipmentRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("equipment:view")];
  const manage = [app.authenticate, requireStudioPermission("equipment:manage")];

  // ── Equipment ────────────────────────────────────────────────────────
  app.get("/equipment", { preHandler: view }, async (request) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await equipment.listEquipment(request.auth!.studioId!, includeInactive) };
  });

  app.get("/equipment/overview", { preHandler: view }, async (request) => ({ ok: true, data: await equipment.getEquipmentOverview(request.auth!.studioId!) }));

  app.get("/equipment/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await equipment.getEquipment(request.auth!.studioId!, id) };
  });

  app.get("/equipment/:id/qr", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const png = await equipmentCheckout.generateEquipmentQrCode(request.auth!.studioId!, id);
    reply.header("Content-Type", "image/png");
    return reply.send(png);
  });

  app.post("/equipment", { preHandler: manage }, async (request) => {
    const body = equipmentInputSchema.parse(request.body);
    return { ok: true, data: await equipment.createEquipment(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/equipment/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = equipmentUpdateSchema.parse(request.body);
    return { ok: true, data: await equipment.updateEquipment(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/equipment/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await equipment.deleteEquipment(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Maintenance ──────────────────────────────────────────────────────
  app.post("/equipment/:id/maintenance", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = maintenanceRecordInputSchema.parse(request.body);
    return { ok: true, data: await equipmentHistory.addMaintenanceRecord(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Repairs ──────────────────────────────────────────────────────────
  app.post("/equipment/:id/repairs", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = repairRecordInputSchema.parse(request.body);
    return { ok: true, data: await equipmentHistory.reportRepair(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/equipment-repairs/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = repairStatusSchema.parse(request.body);
    return { ok: true, data: await equipmentHistory.updateRepairStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  // ── Rentals ──────────────────────────────────────────────────────────
  app.post("/equipment/:id/rentals", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = rentalRecordInputSchema.parse(request.body);
    return { ok: true, data: await equipmentHistory.addRentalRecord(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  // ── Damage reports ───────────────────────────────────────────────────
  app.post("/equipment/:id/damage-reports", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = damageReportInputSchema.parse(request.body);
    return { ok: true, data: await equipmentHistory.reportDamage(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.post("/equipment-damage-reports/:id/resolve", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await equipmentHistory.resolveDamageReport(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Checkout / check-in ──────────────────────────────────────────────
  app.get("/equipment/:id/checkouts", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await equipmentCheckout.listCheckouts(request.auth!.studioId!, id) };
  });

  app.post("/equipment/:id/checkout", { preHandler: manage }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = checkoutInputSchema.parse(request.body);
    try {
      return { ok: true, data: await equipmentCheckout.checkOutEquipment(request.auth!.studioId!, id, body, request.auth!.actorId) };
    } catch (error) {
      if (error instanceof equipmentCheckout.EquipmentDoubleBookedError) {
        return reply.status(409).send({ ok: false, error: { code: error.code, message: error.message, conflictingCheckoutIds: error.conflictingCheckoutIds } });
      }
      throw error;
    }
  });

  app.post("/equipment-checkouts/:id/checkin", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = checkinInputSchema.parse(request.body);
    return { ok: true, data: await equipmentCheckout.checkInEquipment(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.get("/equipment/scan/:token", { preHandler: view }, async (request) => {
    const { token } = z.object({ token: z.string().min(10) }).parse(request.params);
    return { ok: true, data: await equipmentCheckout.resolveEquipmentByQrToken(request.auth!.studioId!, token) };
  });
}
