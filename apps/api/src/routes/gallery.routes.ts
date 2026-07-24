import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { galleryInputSchema, galleryUpdateSchema, photoUploadInputSchema, photoUpdateInputSchema } from "@bcp/gallery";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { prisma } from "@bcp/database";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as galleries from "../services/galleries.service";
import * as galleryPublic from "../services/gallery-public.service";

const idParamsSchema = z.object({ id: z.string().uuid() });
const photoParamsSchema = z.object({ id: z.string().uuid(), photoId: z.string().uuid() });

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function galleryRoutes(app: FastifyInstance) {
  const view = [app.authenticate, requireStudioPermission("gallery:view")];
  const manage = [app.authenticate, requireStudioPermission("gallery:manage")];

  app.get("/galleries", { preHandler: view }, async (request) => {
    const { status } = z.object({ status: z.string().optional() }).parse(request.query);
    return { ok: true, data: await galleries.listGalleries(request.auth!.studioId!, { status }) };
  });

  app.get("/galleries/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await galleries.getGallery(request.auth!.studioId!, id) };
  });

  app.get("/galleries/:id/stats", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await galleries.getGalleryStats(request.auth!.studioId!, id) };
  });

  app.get("/galleries/:id/qr", { preHandler: view }, async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const gallery = await galleries.getGallery(request.auth!.studioId!, id);
    const png = await galleryPublic.generateGalleryQrCode(gallery.publicToken);
    reply.header("Content-Type", "image/png");
    return reply.send(png);
  });

  app.post("/events/:eventId/galleries", { preHandler: manage }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
    const body = galleryInputSchema.parse(request.body);
    return { ok: true, data: await galleries.createGallery(request.auth!.studioId!, eventId, body, request.auth!.actorId) };
  });

  app.patch("/galleries/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = galleryUpdateSchema.parse(request.body);
    return { ok: true, data: await galleries.updateGallery(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.post("/galleries/:id/deliver", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await galleries.markGalleryDelivered(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.get("/galleries/:id/photos/:photoId/thumbnail", { preHandler: view }, async (request, reply) => {
    const { id, photoId } = photoParamsSchema.parse(request.params);
    const photo = await prisma.galleryPhoto.findFirst({ where: { id: photoId, galleryId: id, studioId: request.auth!.studioId! } });
    if (!photo) return reply.status(404).send({ ok: false });
    const key = photo.thumbnailKey ?? photo.fileKey;
    const url = await getStorageClient().getSignedGetUrl(key);
    return reply.redirect(url);
  });

  // ── Photos ───────────────────────────────────────────────────────────
  app.post("/galleries/:id/photos", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = photoUploadInputSchema.parse(request.body);
    return { ok: true, data: await galleries.addPhoto(request.auth!.studioId!, id, body, request.auth!.actorId) };
  });

  app.patch("/galleries/:id/photos/:photoId", { preHandler: manage }, async (request) => {
    const { id, photoId } = photoParamsSchema.parse(request.params);
    const body = photoUpdateInputSchema.parse(request.body);
    return { ok: true, data: await galleries.updatePhoto(request.auth!.studioId!, id, photoId, body, request.auth!.actorId) };
  });

  app.delete("/galleries/:id/photos/:photoId", { preHandler: manage }, async (request) => {
    const { id, photoId } = photoParamsSchema.parse(request.params);
    await galleries.removePhoto(request.auth!.studioId!, id, photoId, request.auth!.actorId);
    return { ok: true, data: null };
  });
}
