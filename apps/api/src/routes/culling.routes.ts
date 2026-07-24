import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { startCullingSessionSchema, cullingReviewSchema, startAlbumSuggestionSchema, albumPhotoReviewSchema, setAlbumCoverSchema } from "@bcp/culling";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as culling from "../services/culling-sessions.service";
import * as albums from "../services/album-suggestions.service";

const galleryParamsSchema = z.object({ galleryId: z.string().uuid() });
const idParamsSchema = z.object({ id: z.string().uuid() });

export async function cullingRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("gallery:manage")];
  const view = [app.authenticate, requireStudioPermission("gallery:view")];

  // ── Culling sessions ─────────────────────────────────────────────────
  app.post("/galleries/:galleryId/culling-sessions", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    const body = startCullingSessionSchema.parse(request.body);
    return { ok: true, data: await culling.startCullingSession(request.auth!.studioId!, galleryId, body, request.auth!.actorId) };
  });

  app.get("/galleries/:galleryId/culling-sessions", { preHandler: view }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await culling.listCullingSessions(request.auth!.studioId!, galleryId) };
  });

  app.get("/culling-sessions/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await culling.getCullingSession(request.auth!.studioId!, id) };
  });

  app.post("/culling-recommendations/:id/review", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = cullingReviewSchema.parse(request.body);
    return { ok: true, data: await culling.reviewRecommendation(request.auth!.studioId!, id, status) };
  });

  // ── Album suggestions ────────────────────────────────────────────────
  app.post("/galleries/:galleryId/album-suggestions", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    const body = startAlbumSuggestionSchema.parse(request.body);
    return { ok: true, data: await albums.startAlbumSuggestion(request.auth!.studioId!, galleryId, body.presetType, body.targetPhotoCount, request.auth!.actorId) };
  });

  app.get("/galleries/:galleryId/album-suggestions", { preHandler: view }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await albums.listAlbumSuggestions(request.auth!.studioId!, galleryId) };
  });

  app.get("/album-suggestions/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await albums.getAlbumSuggestion(request.auth!.studioId!, id) };
  });

  app.post("/album-suggestions/:id/cover", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { galleryPhotoId } = setAlbumCoverSchema.parse(request.body);
    return { ok: true, data: await albums.setAlbumCover(request.auth!.studioId!, id, galleryPhotoId, request.auth!.actorId) };
  });

  app.post("/album-suggestions/:id/photos/:photoId/reorder", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    const { order } = z.object({ order: z.number().int().nonnegative() }).parse(request.body);
    return { ok: true, data: await albums.reorderAlbumPhoto(request.auth!.studioId!, id, photoId, order, request.auth!.actorId) };
  });

  app.post("/album-suggestion-photos/:id/review", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { status } = albumPhotoReviewSchema.parse(request.body);
    return { ok: true, data: await albums.reviewAlbumPhoto(request.auth!.studioId!, id, status) };
  });
}
