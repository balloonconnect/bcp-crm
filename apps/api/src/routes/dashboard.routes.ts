import type { FastifyInstance } from "fastify";
import * as dashboard from "../services/dashboard.service";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", { preHandler: [app.authenticate] }, async (request) => ({
    ok: true,
    data: await dashboard.getDashboardSummary(request.auth!.studioId!),
  }));

  app.get("/dashboard/layout", { preHandler: [app.authenticate] }, async (request) => ({
    ok: true,
    data: await dashboard.getDashboardLayout(request.auth!.actorId),
  }));

  app.put("/dashboard/layout", { preHandler: [app.authenticate] }, async (request) => ({
    ok: true,
    data: await dashboard.saveDashboardLayout(request.auth!.studioId!, request.auth!.actorId, request.body),
  }));
}
