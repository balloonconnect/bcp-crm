import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createExportJobSchema } from "@bcp/data-portability";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as exports from "../services/export-jobs.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function exportJobsRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("studio:manage")];

  app.get("/export-jobs", { preHandler: manage }, async (request) => ({ ok: true, data: await exports.listExportJobs(request.auth!.studioId!) }));

  app.post("/export-jobs", { preHandler: manage }, async (request) => {
    const body = createExportJobSchema.parse(request.body);
    return { ok: true, data: await exports.createExportJob(request.auth!.studioId!, body.exportType, request.auth!.actorId) };
  });

  app.get("/export-jobs/:id/download", { preHandler: manage }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const url = await exports.getExportDownloadUrl(request.auth!.studioId!, id);
    return reply.redirect(url);
  });
}
