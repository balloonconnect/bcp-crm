import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendMessageSchema, confirmActionSchema, rejectActionSchema, reverseActionSchema } from "@bcp/copilot";
import { loadStudioPermissionContext } from "../plugins/permission-context";
import * as copilot from "../services/copilot.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function copilotRoutes(app: FastifyInstance) {
  // Route-level gating is just authentication — the real access control is per-tool, checked against the caller's own granted permissions inside sendMessage() via @bcp/copilot's checkToolAccess().
  const authed = [app.authenticate];

  app.get("/copilot/conversations", { preHandler: authed }, async (request) => {
    return { ok: true, data: await copilot.listConversations(request.auth!.studioId!, request.auth!.actorId) };
  });

  app.get("/copilot/conversations/:id", { preHandler: authed }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await copilot.getConversation(request.auth!.studioId!, id) };
  });

  app.post("/copilot/messages", { preHandler: authed }, async (request, reply) => {
    const body = sendMessageSchema.parse(request.body);
    const context = await loadStudioPermissionContext(request.auth!);
    if (!context) return reply.status(403).send({ ok: false, error: { code: "NO_STUDIO_MEMBERSHIP", message: "No active studio membership" } });

    // Build phase is a studio-wide rollout setting; defaulting to 3 (draft + confirmed actions unlocked) since the platform itself has already built through phase 3 — a studio-level toggle to dial this back to phase 1 is a natural follow-up, not built here.
    const buildPhase = 3 as const;

    const result = await copilot.sendMessage(request.auth!.studioId!, request.auth!.actorId, { conversationId: body.conversationId, content: body.content, grantedPermissions: context.permissions, buildPhase });
    return { ok: true, data: result };
  });

  app.post("/copilot/actions/:id/confirm", { preHandler: authed }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    confirmActionSchema.parse({ actionId: id });
    return { ok: true, data: await copilot.confirmAction(request.auth!.studioId!, request.auth!.actorId, id) };
  });

  app.post("/copilot/actions/:id/reject", { preHandler: authed }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    rejectActionSchema.parse({ actionId: id });
    return { ok: true, data: await copilot.rejectAction(request.auth!.studioId!, request.auth!.actorId, id) };
  });

  app.post("/copilot/actions/:id/reverse", { preHandler: authed }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    reverseActionSchema.parse({ actionId: id });
    return { ok: true, data: await copilot.reverseAction(request.auth!.studioId!, request.auth!.actorId, id) };
  });

  app.get("/copilot/audit-log", { preHandler: authed }, async (request) => {
    const { conversationId } = z.object({ conversationId: z.string().uuid().optional() }).parse(request.query);
    return { ok: true, data: await copilot.getAuditLog(request.auth!.studioId!, conversationId) };
  });
}
