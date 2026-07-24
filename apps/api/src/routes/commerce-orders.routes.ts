import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createOrderSchema, recordCommercePaymentSchema, courierInputSchema, platformCommerceSettingsSchema } from "@bcp/commerce";
import { requireStudioPermission, requirePlatformPermission } from "../plugins/auth-guard";
import * as orders from "../services/commerce-orders.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function commerceOrdersRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("booking:manage")];
  const view = [app.authenticate, requireStudioPermission("booking:view")];

  app.get("/commerce-orders", { preHandler: view }, async (request) => {
    const query = z.object({ status: z.string().optional(), clientId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await orders.listOrders(request.auth!.studioId!, query) };
  });

  app.get("/commerce-orders/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await orders.getOrder(request.auth!.studioId!, id) };
  });

  app.post("/commerce-orders", { preHandler: manage }, async (request) => {
    const body = createOrderSchema.parse(request.body);
    return { ok: true, data: await orders.createOrder(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.post("/commerce-orders/:id/payment", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = recordCommercePaymentSchema.parse(request.body);
    return { ok: true, data: await orders.recordCommercePayment(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/commerce-orders/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await orders.updateOrderStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.post("/commerce-orders/:id/dispatch", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = courierInputSchema.parse(request.body);
    return { ok: true, data: await orders.dispatchOrder(request.auth!.studioId!, id, body.courierName, body.trackingNumber, request.auth!.actorId) };
  });

  app.post("/commerce-orders/:id/delivered", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await orders.markOrderDelivered(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.get("/commerce-orders/:id/lab-export", { preHandler: manage }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const { csv } = await orders.exportOrderForLab(request.auth!.studioId!, id);
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=lab-export.csv");
    return reply.send(csv);
  });

  // ── Platform-wide commission settings (platform admin only) ─────────
  app.get("/platform/commerce-settings", { preHandler: [app.authenticate, requirePlatformPermission("plan:manage")] }, async () => ({ ok: true, data: await orders.getPlatformSettings() }));

  app.patch("/platform/commerce-settings", { preHandler: [app.authenticate, requirePlatformPermission("plan:manage")] }, async (request) => {
    const body = platformCommerceSettingsSchema.parse(request.body);
    return { ok: true, data: await orders.updatePlatformSettings(body) };
  });
}
