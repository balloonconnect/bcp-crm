import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { guestIdentifySchema, otpVerifySchema, selectionActionSchema, commentInputSchema } from "@bcp/selection";
import * as albumPublic from "../services/album-selection-public.service";

const tokenParamsSchema = z.object({ token: z.string().min(10) });

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function albumSelectionPublicRoutes(app: FastifyInstance) {
  // No studio-session auth — a client identifies via the album's own publicToken + guestToken, same pattern as public gallery/quotation access.

  app.post("/public/albums/:token/session", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = z.object({ guestToken: z.string().optional() }).merge(guestIdentifySchema).parse(request.body ?? {});
    const { album, studio, guestToken, accessResult } = await albumPublic.startGuestSession(token, body.guestToken, body);
    return {
      ok: true,
      data: { guestToken, accessResult, studioSlug: studio.slug, studioName: studio.name, album: { selectionLimit: album.selectionLimit, deadline: album.deadline, lockedAt: album.lockedAt, submittedAt: album.submittedAt } },
    };
  });

  app.post("/public/albums/:token/request-otp", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.body);
    return { ok: true, data: await albumPublic.requestAlbumOtp(token, guestToken) };
  });

  app.post("/public/albums/:token/verify-otp", async (request) => {
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(otpVerifySchema).parse(request.body);
    return { ok: true, data: await albumPublic.verifyAlbumOtp(guestToken, body.code) };
  });

  app.get("/public/albums/:token/photos", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    return { ok: true, data: await albumPublic.listSelectablePhotos(token, guestToken) };
  });

  app.get("/public/albums/:token/photos/:photoId/image", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    const storageKey = await albumPublic.resolveSelectablePhotoKey(token, guestToken, photoId);
    const url = await getStorageClient().getSignedGetUrl(storageKey);
    return reply.redirect(url);
  });

  app.post("/public/albums/:token/photos/:photoId/action", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    const { guestToken, action } = z.object({ guestToken: z.string() }).merge(selectionActionSchema).parse(request.body);
    return { ok: true, data: await albumPublic.applySelectionAction(token, guestToken, photoId, action) };
  });

  app.post("/public/albums/:token/photos/:photoId/comment", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    const { guestToken, comment } = z.object({ guestToken: z.string() }).merge(commentInputSchema).parse(request.body);
    return { ok: true, data: await albumPublic.addComment(token, guestToken, photoId, comment) };
  });

  app.post("/public/albums/:token/submit", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.body);
    return { ok: true, data: await albumPublic.submitSelection(token, guestToken) };
  });

  app.get("/public/albums/:token/download-selected", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    const keys = await albumPublic.getSelectedOriginalKeys(token, guestToken);
    const urls = await Promise.all(keys.map(async (k) => ({ galleryPhotoId: k.galleryPhotoId, url: await getStorageClient().getSignedGetUrl(k.fileKey) })));
    return { ok: true, data: urls };
  });
}
