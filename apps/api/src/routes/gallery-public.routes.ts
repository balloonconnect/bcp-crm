import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { prisma } from "@bcp/database";
import { guestIdentifySchema, passwordVerifySchema, otpVerifySchema, commentInputSchema, downloadRequestSchema } from "@bcp/gallery";
import { consentInputSchema, startFaceSearchSchema, manualCorrectionSchema } from "@bcp/face-recognition";
import * as galleryPublic from "../services/gallery-public.service";
import * as faceSearch from "../services/face-search.service";

const tokenParamsSchema = z.object({ token: z.string().min(10) });

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function galleryPublicRoutes(app: FastifyInstance) {
  // No studio-session auth on any of these — a gallery guest identifies via publicToken + guestToken only, the same pattern established for public quotation approval (Prompt 16).

  app.post("/public/galleries/:token/session", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = z.object({ guestToken: z.string().optional() }).merge(guestIdentifySchema).parse(request.body ?? {});
    const { gallery, studio, guestToken, accessResult } = await galleryPublic.startGuestSession(token, body.guestToken, body);
    return {
      ok: true,
      data: {
        guestToken,
        accessResult,
        studioSlug: studio.slug,
        studioName: studio.name,
        gallery: {
          title: gallery.title,
          description: gallery.description,
          layout: gallery.layout,
          photoCount: gallery.photoCount,
          allowOriginalDownload: gallery.allowOriginalDownload,
          allowCompressedDownload: gallery.allowCompressedDownload,
          faceSearchEnabled: gallery.faceSearchEnabled,
        },
      },
    };
  });

  app.post("/public/galleries/:token/verify-password", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(passwordVerifySchema).parse(request.body);
    return { ok: true, data: await galleryPublic.verifyGalleryPassword(token, guestToken, body.password) };
  });

  app.post("/public/galleries/:token/request-otp", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.body);
    return { ok: true, data: await galleryPublic.requestGalleryOtp(token, guestToken) };
  });

  app.post("/public/galleries/:token/verify-otp", async (request) => {
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(otpVerifySchema).parse(request.body);
    return { ok: true, data: await galleryPublic.verifyGalleryOtp(guestToken, body.code) };
  });

  app.get("/public/galleries/:token/photos", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    return { ok: true, data: await galleryPublic.listPublicPhotos(token, guestToken) };
  });

  app.post("/public/galleries/:token/photos/:photoId/favorite", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.body);
    return { ok: true, data: await galleryPublic.toggleFavorite(token, guestToken, photoId) };
  });

  app.get("/public/galleries/:token/comments", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    return { ok: true, data: await galleryPublic.listComments(token, guestToken) };
  });

  app.post("/public/galleries/:token/comments", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(commentInputSchema).parse(request.body);
    return { ok: true, data: await galleryPublic.addComment(token, guestToken, body) };
  });

  app.get("/public/galleries/:token/photos/:photoId/image", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(request.params);
    const { guestToken, purpose } = z.object({ guestToken: z.string(), purpose: z.enum(["view", "download_original", "download_compressed"]).default("view") }).parse(request.query);
    const { storageKey } = await galleryPublic.resolvePhotoImageUrl(token, guestToken, photoId, purpose);
    const url = await getStorageClient().getSignedGetUrl(storageKey);
    return reply.redirect(url);
  });

  app.post("/public/galleries/:token/download", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(downloadRequestSchema).parse(request.body);
    return { ok: true, data: await galleryPublic.requestDownload(token, guestToken, body) };
  });

  // ── Face recognition — guest-facing flow ─────────────────────────────
  // Every one of these resolves the gallery by its public token first,
  // so a search can never be pointed at a gallery/studio the guest
  // isn't actually looking at — the same "no cross-studio, no
  // unauthorized cross-event search" guarantee the schema itself
  // enforces, held here too at the route boundary.

  app.post("/public/galleries/:token/face-search/consent", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = z.object({ guestToken: z.string() }).merge(consentInputSchema).parse(request.body);
    const gallery = await prisma.gallery.findUniqueOrThrow({ where: { publicToken: token } });
    const log = await faceSearch.recordConsent(gallery.studioId, gallery.id, body.guestToken, body.consentText, { ipAddress: request.ip, userAgent: request.headers["user-agent"] });
    return { ok: true, data: log };
  });

  app.post("/public/galleries/:token/face-search/check-quality", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ ok: false, error: { code: "NO_FILE", message: "No image uploaded" } });
    const imageBytes = await file.toBuffer();
    return { ok: true, data: await faceSearch.checkCaptureQuality(imageBytes) };
  });

  app.post("/public/galleries/:token/face-search", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const file = await request.file();
    if (!file) return reply.status(400).send({ ok: false, error: { code: "NO_FILE", message: "No image uploaded" } });

    const fields = file.fields as Record<string, { value?: string } | undefined>;
    const body = startFaceSearchSchema.extend({ guestToken: z.string() }).parse({
      guestToken: fields.guestToken?.value,
      mode: fields.mode?.value,
      proceedDespiteWarning: fields.proceedDespiteWarning?.value === "true",
    });

    const imageBytes = await file.toBuffer();
    const gallery = await prisma.gallery.findUniqueOrThrow({ where: { publicToken: token } });

    const result = await faceSearch.runFaceSearch(gallery.studioId, gallery.id, { guestToken: body.guestToken, mode: body.mode, imageBytes, proceedDespiteWarning: body.proceedDespiteWarning });
    return { ok: true, data: result };
  });

  app.post("/public/galleries/:token/face-search/:sessionId/correct", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const body = manualCorrectionSchema.parse(request.body);
    const gallery = await prisma.gallery.findUniqueOrThrow({ where: { publicToken: token } });
    return { ok: true, data: await faceSearch.correctMatch(gallery.studioId, sessionId, body.matchId, body.isCorrect) };
  });
}
