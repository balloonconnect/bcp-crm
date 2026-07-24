import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { runReportSchema, saveReportSchema, scheduleReportSchema } from "@bcp/reports";
import { requireStudioPermission } from "../plugins/auth-guard";
import { runReport } from "../services/reports.service";
import * as savedReports from "../services/saved-reports.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function reportsRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("report:view")];

  app.post("/reports/run", { preHandler: view }, async (request) => {
    const body = runReportSchema.parse(request.body);
    return { ok: true, data: await runReport(request.auth!.studioId!, body.reportType, body.filters ?? {}) };
  });

  app.get("/reports/saved", { preHandler: view }, async (request) => ({ ok: true, data: await savedReports.listSavedReports(request.auth!.studioId!) }));

  app.post("/reports/saved", { preHandler: view }, async (request) => {
    const body = saveReportSchema.parse(request.body);
    return { ok: true, data: await savedReports.saveReport(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.delete("/reports/saved/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await savedReports.deleteSavedReport(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });

  app.get("/reports/saved/:id/export/csv", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const csv = await savedReports.exportSavedReportCsv(request.auth!.studioId!, id);
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=report.csv");
    return reply.send(csv);
  });

  app.get("/reports/saved/:id/export/pdf", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const pdf = await savedReports.exportSavedReportPdf(request.auth!.studioId!, id);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", "attachment; filename=report.pdf");
    return reply.send(pdf);
  });

  // ── Scheduled reports ────────────────────────────────────────────────
  app.get("/reports/schedules", { preHandler: view }, async (request) => ({ ok: true, data: await savedReports.listScheduledReports(request.auth!.studioId!) }));

  app.post("/reports/schedules", { preHandler: view }, async (request) => {
    const body = scheduleReportSchema.parse(request.body);
    return { ok: true, data: await savedReports.createSchedule(request.auth!.studioId!, body, request.auth!.actorId) };
  });

  app.post("/reports/schedules/:id/enable", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await savedReports.setScheduleActive(request.auth!.studioId!, id, true, request.auth!.actorId) };
  });

  app.post("/reports/schedules/:id/disable", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await savedReports.setScheduleActive(request.auth!.studioId!, id, false, request.auth!.actorId) };
  });

  app.delete("/reports/schedules/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    await savedReports.deleteSchedule(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });
}
