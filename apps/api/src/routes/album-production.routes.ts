import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assignDesignerSchema, uploadSpreadSchema, stageTransitionSchema, printOrderInputSchema, courierInputSchema } from "@bcp/album-production";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as albumProduction from "../services/album-production.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function albumProductionRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("album:manage")];
  const view = [app.authenticate, requireStudioPermission("album:view")];

  app.post("/albums/:id/designer", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { designerId } = assignDesignerSchema.parse(request.body);
    return { ok: true, data: await albumProduction.assignDesigner(request.auth!.studioId!, id, designerId, request.auth!.actorId) };
  });

  app.post("/albums/:id/stage", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { stage } = stageTransitionSchema.parse(request.body);
    return { ok: true, data: await albumProduction.transitionStage(request.auth!.studioId!, id, stage, request.auth!.actorId) };
  });

  app.post("/albums/:id/spreads", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = uploadSpreadSchema.parse(request.body);
    return { ok: true, data: await albumProduction.uploadSpread(request.auth!.studioId!, id, body.spreadNumber, body.fileKey, request.auth!.actorId) };
  });

  app.get("/albums/:id/spreads", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumProduction.listSpreads(request.auth!.studioId!, id) };
  });

  app.post("/albums/:id/approve-full", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumProduction.approveFullAlbum(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Print orders ─────────────────────────────────────────────────────
  app.post("/albums/:id/print-orders", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = printOrderInputSchema.parse(request.body);
    return { ok: true, data: await albumProduction.createPrintOrder(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.get("/albums/:id/print-orders", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumProduction.listPrintOrders(request.auth!.studioId!, id) };
  });

  app.patch("/print-orders/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await albumProduction.markPrintOrderStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.post("/print-orders/:id/dispatch", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = courierInputSchema.parse(request.body);
    return { ok: true, data: await albumProduction.dispatchPrintOrder(request.auth!.studioId!, id, body.courierName, body.trackingNumber, request.auth!.actorId) };
  });

  app.post("/print-orders/:id/delivered", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumProduction.markPrintOrderDelivered(request.auth!.studioId!, id, request.auth!.actorId) };
  });
}
