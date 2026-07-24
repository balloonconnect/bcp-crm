import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eAlbumSettingsSchema } from "@bcp/album-production";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as ealbum from "../services/ealbum.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function ealbumRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("album:manage")];

  app.post("/albums/:id/ealbum/link", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await ealbum.ensureEAlbumLink(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.patch("/albums/:id/ealbum/settings", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = eAlbumSettingsSchema.parse(request.body);
    return { ok: true, data: await ealbum.updateEAlbumSettings(request.auth!.studioId!, id, { password: body.password, otpRequired: body.otpRequired, downloadEnabled: body.downloadEnabled }, request.auth!.actorId) };
  });

  app.post("/albums/:id/ealbum/share/whatsapp", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { toPhone } = z.object({ toPhone: z.string().min(6) }).parse(request.body);
    return { ok: true, data: await ealbum.shareEAlbumViaWhatsApp(request.auth!.studioId!, id, toPhone, request.auth!.actorId) };
  });
}
