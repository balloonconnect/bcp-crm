import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { serviceInputSchema, serviceUpdateSchema, packageInputSchema, packageUpdateSchema } from "@bcp/catalog";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as services from "../services/services-catalog.service";
import * as packages from "../services/packages.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function catalogRoutes(app: FastifyInstance) {
  const viewServices = [app.authenticate, requireStudioPermission("service:view")];
  const manageServices = [app.authenticate, requireStudioPermission("service:manage")];
  const viewPackages = [app.authenticate, requireStudioPermission("package:view")];
  const managePackages = [app.authenticate, requireStudioPermission("package:manage")];

  // ── Services ─────────────────────────────────────────────────────────
  app.get("/services", { preHandler: viewServices }, async (request) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await services.listServices(request.auth!.studioId!, includeInactive) };
  });

  app.post("/services", { preHandler: manageServices }, async (request) => {
    const body = serviceInputSchema.parse(request.body);
    return { ok: true, data: await services.createService(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/services/:id", { preHandler: manageServices }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = serviceUpdateSchema.parse(request.body);
    return { ok: true, data: await services.updateService(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/services/:id", { preHandler: manageServices }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await services.deleteService(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  app.post("/services/seed-defaults", { preHandler: manageServices }, async (request) => ({
    ok: true,
    data: await services.seedDefaultServices(request.auth!.studioId!, request.auth!.actorId),
  }));

  // ── Packages ─────────────────────────────────────────────────────────
  app.get("/packages", { preHandler: viewPackages }, async (request) => {
    const { includeInactive } = z.object({ includeInactive: z.coerce.boolean().optional() }).parse(request.query);
    return { ok: true, data: await packages.listPackages(request.auth!.studioId!, includeInactive) };
  });

  app.get("/packages/:id", { preHandler: viewPackages }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await packages.getPackage(request.auth!.studioId!, id) };
  });

  // Studio-only views — margin must never be reachable from a customer-facing surface.
  app.get("/packages/:id/margin", { preHandler: viewPackages }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await packages.getPackageMargin(request.auth!.studioId!, id) };
  });

  // The one sanctioned customer-safe view — see packages.service.ts's doc comment.
  app.get("/packages/:id/customer-view", { preHandler: viewPackages }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await packages.getCustomerFacingPackageView(request.auth!.studioId!, id) };
  });

  app.post("/packages", { preHandler: managePackages }, async (request) => {
    const body = packageInputSchema.parse(request.body);
    return { ok: true, data: await packages.createPackage(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.patch("/packages/:id", { preHandler: managePackages }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = packageUpdateSchema.parse(request.body);
    return { ok: true, data: await packages.updatePackage(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.delete("/packages/:id", { preHandler: managePackages }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await packages.deletePackage(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });
}
