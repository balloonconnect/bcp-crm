import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireStudioPermission, requirePlatformPermission } from "../plugins/auth-guard";
import * as jobs from "../services/jobs.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const filterSchema = z.object({ queue: z.string().optional(), status: z.string().optional() });

export async function jobsRoutes(app: FastifyInstance) {
  // ── Studio-visible status ─────────────────────────────────────────
  const studioView = [app.authenticate, requireStudioPermission("studio:manage")];

  app.get("/jobs", { preHandler: studioView }, async (request) => {
    const filter = filterSchema.parse(request.query);
    return { ok: true, data: await jobs.listJobsForStudio(request.auth!.studioId!, filter) };
  });

  app.get("/jobs/:id", { preHandler: studioView }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await jobs.getJobForStudio(request.auth!.studioId!, id) };
  });

  app.post("/jobs/:id/cancel", { preHandler: studioView }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await jobs.cancelJob(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  // ── Admin monitoring ───────────────────────────────────────────────
  // Note: GET /platform/jobs (list) and POST /platform/jobs/:jobId/retry already
  // exist in platform-admin.routes.ts (infrastructure.service.ts) — not duplicated here.
  const platformView = [app.authenticate, requirePlatformPermission("studio:view")];

  app.get("/platform/jobs/health", { preHandler: platformView }, async () => ({ ok: true, data: await jobs.getQueueHealthSummary() }));

  app.post("/platform/jobs/:id/cancel", { preHandler: [app.authenticate, requirePlatformPermission("studio:manage")] }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await jobs.cancelJob(null, id, request.auth!.actorId) };
  });
}
