import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { gallerySettingsInputSchema } from "@bcp/face-recognition";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as faceCollections from "../services/face-collections.service";

const galleryParamsSchema = z.object({ galleryId: z.string().uuid() });

export async function faceRecognitionRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("gallery:manage")];
  const view = [app.authenticate, requireStudioPermission("gallery:view")];

  app.post("/galleries/:galleryId/face-search/enable", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await faceCollections.enableFaceSearch(request.auth!.studioId!, galleryId, request.auth!.actorId) };
  });

  app.patch("/galleries/:galleryId/face-search/settings", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    const body = gallerySettingsInputSchema.parse(request.body);
    return { ok: true, data: await faceCollections.updateFaceSearchSettings(request.auth!.studioId!, galleryId, body, request.auth!.actorId) };
  });

  app.post("/galleries/:galleryId/photos/:photoId/index-faces", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    return { ok: true, data: await faceCollections.indexPhotoFaces(request.auth!.studioId!, galleryId, photoId) };
  });

  app.get("/galleries/:galleryId/face-search/usage", { preHandler: view }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await faceCollections.getFaceSearchUsage(request.auth!.studioId!, galleryId) };
  });

  // "Privacy logs" — the studio's own compliance view of every consent recorded.
  app.get("/galleries/:galleryId/face-search/consent-logs", { preHandler: view }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await faceCollections.listConsentLogs(request.auth!.studioId!, galleryId) };
  });
}
