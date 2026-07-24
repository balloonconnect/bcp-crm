import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { spreadCommentSchema, spreadApprovalSchema, revisionRequestSchema } from "@bcp/album-production";
import * as productionPublic from "../services/album-production-public.service";

const tokenParamsSchema = z.object({ token: z.string().min(10) });

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function albumProductionPublicRoutes(app: FastifyInstance) {
  // Reuses the same publicToken + guestToken session Prompt 31's selection flow established — a client reviewing design proofs is a continuation of the same album relationship.

  app.get("/public/albums/:token/spreads", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    return { ok: true, data: await productionPublic.listSpreadsForClient(token, guestToken) };
  });

  app.get("/public/albums/:token/spreads/:spreadId/image", async (request, reply) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { spreadId } = z.object({ spreadId: z.string().uuid() }).parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    const spreads = await productionPublic.listSpreadsForClient(token, guestToken);
    const spread = spreads.find((s: { id: string }) => s.id === spreadId);
    if (!spread) return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Spread not found" } });
    const url = await getStorageClient().getSignedGetUrl(spread.fileKey);
    return reply.redirect(url);
  });

  app.post("/public/albums/:token/spreads/:spreadId/comments", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { spreadId } = z.object({ spreadId: z.string().uuid() }).parse(request.params);
    const { guestToken, ...body } = z.object({ guestToken: z.string() }).merge(spreadCommentSchema).parse(request.body);
    return { ok: true, data: await productionPublic.addSpreadComment(token, guestToken, spreadId, body) };
  });

  app.post("/public/albums/:token/spreads/:spreadId/approval", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { spreadId } = z.object({ spreadId: z.string().uuid() }).parse(request.params);
    const { guestToken, status, comment } = z.object({ guestToken: z.string() }).merge(spreadApprovalSchema).parse(request.body);
    return { ok: true, data: await productionPublic.submitSpreadApproval(token, guestToken, spreadId, status, comment) };
  });

  app.post("/public/albums/:token/request-revision", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken, notes } = z.object({ guestToken: z.string() }).merge(revisionRequestSchema).parse(request.body);
    return { ok: true, data: await productionPublic.requestRevision(token, guestToken, notes) };
  });

  app.get("/public/albums/:token/revision-status", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { guestToken } = z.object({ guestToken: z.string() }).parse(request.query);
    return { ok: true, data: await productionPublic.getRevisionStatus(token, guestToken) };
  });
}
