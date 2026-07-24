import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { eAlbumPasswordVerifySchema, eAlbumOtpVerifySchema } from "@bcp/album-production";
import { sendAuthEmail } from "../services/notify";
import * as ealbum from "../services/ealbum.service";

const tokenParamsSchema = z.object({ token: z.string().min(10) });

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function ealbumPublicRoutes(app: FastifyInstance) {
  app.post("/public/ealbum/:token/session", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string().optional() }).parse(request.body ?? {});
    const { studio, guestToken: newToken, accessResult, downloadEnabled } = await ealbum.startEAlbumSession(token, guestToken);
    return { ok: true, data: { guestToken: newToken, accessResult, studioSlug: studio.slug, studioName: studio.name, downloadEnabled } };
  });

  app.post("/public/ealbum/:token/verify-password", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(eAlbumPasswordVerifySchema).parse(request.body);
    return { ok: true, data: await ealbum.verifyEAlbumPassword(token, guestToken, body.password) };
  });

  app.post("/public/ealbum/:token/request-otp", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken, email } = z.object({ guestToken: z.string(), email: z.string().email() }).parse(request.body);
    return {
      ok: true,
      data: await ealbum.requestEAlbumOtp(token, guestToken, async (code) => {
        await sendAuthEmail({ to: email, subject: "Your e-album access code", html: `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>` }).catch(() => undefined);
      }),
    };
  });

  app.post("/public/ealbum/:token/verify-otp", async (request) => {
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(eAlbumOtpVerifySchema).parse(request.body);
    return { ok: true, data: await ealbum.verifyEAlbumOtp(guestToken, body.code) };
  });

  app.get("/public/ealbum/:token/pages", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    return { ok: true, data: await ealbum.getEAlbumPages(token, guestToken) };
  });

  app.get("/public/ealbum/:token/pages/:pageId/image", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { pageId } = z.object({ pageId: z.string().uuid() }).parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    const pages = await ealbum.getEAlbumPages(token, guestToken);
    const page = pages.find((p: { id: string }) => p.id === pageId);
    if (!page) return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Page not found" } });
    const url = await getStorageClient().getSignedGetUrl(page.fileKey);
    return reply.redirect(url);
  });

  app.get("/public/ealbum/:token/download", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    const keys = await ealbum.getEAlbumDownloadKeys(token, guestToken);
    const urls = await Promise.all(keys.map((key) => getStorageClient().getSignedGetUrl(key)));
    return { ok: true, data: urls };
  });
}
