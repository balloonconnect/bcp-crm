import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireStudioPermission, requirePlatformPermission } from "../plugins/auth-guard";
import * as accountDeletion from "../services/account-deletion.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const decideSchema = z.object({ approve: z.boolean(), rejectedReason: z.string().max(1000).optional() });

export async function accountDeletionRoutes(app: FastifyInstance) {
  const authed = [app.authenticate];

  // ── Personal data export & self-deletion — any signed-in studio user ──
  app.get("/account/export", { preHandler: authed }, async (request) => ({ ok: true, data: await accountDeletion.exportMyPersonalData(request.auth!.studioId!, request.auth!.actorId) }));

  app.post("/account/delete", { preHandler: authed }, async (request) => {
    await accountDeletion.deleteMyAccount(request.auth!.studioId!, request.auth!.actorId, request.auth!.actorId);
    return { ok: true, data: null };
  });

  // ── Studio deletion request — a studio owner/admin can request, never approve ──
  const studioManage = [app.authenticate, requireStudioPermission("studio:manage")];

  app.get("/studio-deletion-requests", { preHandler: studioManage }, async (request) => ({ ok: true, data: await accountDeletion.listStudioDeletionRequests(request.auth!.studioId!) }));

  app.post("/studio-deletion-requests", { preHandler: studioManage }, async (request) => {
    const body = z.object({ reason: z.string().max(1000).optional() }).parse(request.body ?? {});
    return { ok: true, data: await accountDeletion.requestStudioDeletion(request.auth!.studioId!, body.reason, request.auth!.actorId) };
  });

  // ── Platform admin — the only path that can ever approve ──────────
  const platformApprove = [app.authenticate, requirePlatformPermission("studio:manage")];

  app.get("/platform/studio-deletion-requests", { preHandler: platformApprove }, async () => ({ ok: true, data: await accountDeletion.listAllStudioDeletionRequestsForPlatform() }));

  app.post("/platform/studio-deletion-requests/:id/decide", { preHandler: platformApprove }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = decideSchema.parse(request.body);
    return { ok: true, data: await accountDeletion.decideStudioDeletion(id, body.approve, request.auth!.actorId, body.rejectedReason) };
  });
}
