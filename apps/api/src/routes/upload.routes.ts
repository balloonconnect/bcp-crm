import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requestUploadSchema, uploadChunkCompleteSchema } from "@bcp/upload";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as uploadSessions from "../services/upload-sessions.service";
import { DuplicateUploadError } from "../services/upload-sessions.service";

const galleryParamsSchema = z.object({ galleryId: z.string().uuid() });
const sessionParamsSchema = z.object({ id: z.string().uuid() });

export async function uploadRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("gallery:manage")];

  app.get("/galleries/:galleryId/upload-sessions", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await uploadSessions.listUploadSessions(request.auth!.studioId!, galleryId) };
  });

  app.post("/galleries/:galleryId/upload-sessions", { preHandler: manage }, async (request, reply) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    const body = requestUploadSchema.parse(request.body);
    try {
      const session = await uploadSessions.createUploadSession(request.auth!.studioId!, galleryId, body, request.auth!.actorId);
      return { ok: true, data: session };
    } catch (error) {
      if (error instanceof DuplicateUploadError) {
        return reply.status(409).send({ ok: false, error: { code: error.code, message: error.message, matchedPhotoId: error.matchedPhotoId, matchedSessionId: error.matchedSessionId } });
      }
      throw error;
    }
  });

  app.get("/upload-sessions/:id/chunks/:chunkIndex/url", { preHandler: manage }, async (request) => {
    const { id } = sessionParamsSchema.parse(request.params);
    const { chunkIndex } = z.object({ chunkIndex: z.coerce.number().int().nonnegative() }).parse(request.params);
    return { ok: true, data: await uploadSessions.getChunkUploadUrl(request.auth!.studioId!, id, chunkIndex) };
  });

  app.post("/upload-sessions/:id/chunks/complete", { preHandler: manage }, async (request) => {
    const { id } = sessionParamsSchema.parse(request.params);
    const body = uploadChunkCompleteSchema.parse(request.body);
    return { ok: true, data: await uploadSessions.completeChunk(request.auth!.studioId!, id, body.chunkIndex, body.etag, request.auth!.actorId) };
  });

  app.post("/upload-sessions/:id/pause", { preHandler: manage }, async (request) => {
    const { id } = sessionParamsSchema.parse(request.params);
    return { ok: true, data: await uploadSessions.pauseUpload(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/upload-sessions/:id/resume", { preHandler: manage }, async (request) => {
    const { id } = sessionParamsSchema.parse(request.params);
    return { ok: true, data: await uploadSessions.resumeUpload(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/upload-sessions/:id/retry", { preHandler: manage }, async (request) => {
    const { id } = sessionParamsSchema.parse(request.params);
    return { ok: true, data: await uploadSessions.retryUpload(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.delete("/upload-sessions/:id", { preHandler: manage }, async (request) => {
    const { id } = sessionParamsSchema.parse(request.params);
    await uploadSessions.abortUpload(request.auth!.studioId!, id, request.auth!.actorId);
    return { ok: true, data: null };
  });
}
