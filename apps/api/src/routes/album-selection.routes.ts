import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { albumSettingsInputSchema } from "@bcp/selection";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as albumSelection from "../services/album-selection.service";
import { sendWhatsAppMessage } from "../services/whatsapp-sender.service";
import { prisma } from "@bcp/database";

const idParamsSchema = z.object({ id: z.string().uuid() });

export async function albumSelectionRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("album:manage")];
  const view = [app.authenticate, requireStudioPermission("album:view")];

  app.get("/albums", { preHandler: view }, async (request) => {
    const { status } = z.object({ status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await albumSelection.listAlbums(request.auth!.studioId!, { status }) };
  });

  app.get("/albums/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumSelection.getAlbum(request.auth!.studioId!, id) };
  });

  app.patch("/albums/:id/status", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = z.object({ status: z.string() }).parse(request.body);
    return { ok: true, data: await albumSelection.updateAlbumStatus(request.auth!.studioId!, id, status, request.auth!.actorId) };
  });

  app.post("/events/:eventId/albums", { preHandler: manage }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
    const { sourceGalleryId } = z.object({ sourceGalleryId: z.string().uuid().optional() }).parse(request.body);
    return { ok: true, data: await albumSelection.createAlbum(request.auth!.studioId!, eventId, sourceGalleryId, request.auth!.actorId) };
  });

  app.patch("/albums/:id/settings", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = albumSettingsInputSchema.parse(request.body);
    return { ok: true, data: await albumSelection.updateAlbumSettings(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.get("/albums/:id/selection-summary", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumSelection.getSelectionSummary(request.auth!.studioId!, id) };
  });

  app.get("/albums/:id/selection-history", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumSelection.getSelectionHistory(request.auth!.studioId!, id) };
  });

  app.get("/albums/:id/export/filenames", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumSelection.exportSelectionFilenames(request.auth!.studioId!, id) };
  });

  app.get("/albums/:id/export/csv", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const csv = await albumSelection.exportSelectionCsv(request.auth!.studioId!, id);
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", "attachment; filename=selection.csv");
    return reply.send(csv);
  });

  app.post("/albums/:id/reopen", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albumSelection.reopenSelection(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/albums/:id/send-reminder", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const album = await albumSelection.getAlbum(request.auth!.studioId!, id);
    const event = await prisma.event.findUnique({ where: { id: album.eventId }, select: { contactPersonPhone: true } });

    await albumSelection.sendSelectionReminder(request.auth!.studioId!, id, request.auth!.actorId, async (message) => {
      if (event?.contactPersonPhone) {
        await sendWhatsAppMessage(request.auth!.studioId!, { to: event.contactPersonPhone, messageType: "text", body: message, contextType: "Album", contextId: id }, request.auth!.actorId).catch(() => undefined);
      }
    });
    return { ok: true, data: null };
  });
}
