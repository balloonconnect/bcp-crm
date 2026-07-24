import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requestBackupSchema, approveBackupSchema, requestRestoreSchema } from "@bcp/data-portability";
import { requireStudioPermission, requirePlatformPermission } from "../plugins/auth-guard";
import * as backups from "../services/backup-restore.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function backupRestoreRoutes(app: FastifyInstance) {
  const studioManage = [app.authenticate, requireStudioPermission("studio:manage")];
  const platformApprove = [app.authenticate, requirePlatformPermission("studio:manage")];

  // ── Studio side: request only, never approve ──────────────────────
  app.get("/backups", { preHandler: studioManage }, async (request) => ({ ok: true, data: await backups.listBackups(request.auth!.studioId!) }));

  app.post("/backups/request", { preHandler: studioManage }, async (request) => {
    requestBackupSchema.parse(request.body ?? {});
    return { ok: true, data: await backups.requestBackup(request.auth!.studioId!, request.auth!.actorId) };
  });

  app.get("/restores", { preHandler: studioManage }, async (request) => ({ ok: true, data: await backups.listRestoreJobs(request.auth!.studioId!) }));

  app.post("/restores/request", { preHandler: studioManage }, async (request) => {
    const body = requestRestoreSchema.parse(request.body);
    return { ok: true, data: await backups.requestRestore(request.auth!.studioId!, body.backupId, request.auth!.actorId) };
  });

  // ── Platform admin side: the only path that can ever approve ──────
  app.get("/platform/backups", { preHandler: platformApprove }, async (request) => {
    const { status } = z.object({ status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await backups.listAllBackupsForPlatform(status) };
  });

  app.get("/platform/restores", { preHandler: platformApprove }, async (request) => {
    const { status } = z.object({ status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await backups.listAllRestoreJobsForPlatform(status) };
  });

  app.post("/platform/backups/:id/decide", { preHandler: platformApprove }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = approveBackupSchema.parse(request.body);
    return { ok: true, data: await backups.decideBackupApproval(id, body.approve, request.auth!.actorId, body.rejectedReason) };
  });

  app.post("/platform/restores/:id/decide", { preHandler: platformApprove }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = approveBackupSchema.parse(request.body);
    return { ok: true, data: await backups.decideRestoreApproval(id, body.approve, request.auth!.actorId, body.rejectedReason) };
  });
}
