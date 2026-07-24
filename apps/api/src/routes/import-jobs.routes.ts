import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createImportJobSchema, setColumnMappingSchema, processImportSchema } from "@bcp/data-portability";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as imports from "../services/import-jobs.service";

const idParamsSchema = z.object({ id: z.string().uuid() });

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

export async function importJobsRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("studio:manage")];

  app.post("/import-jobs/upload", { preHandler: manage }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ ok: false, error: { code: "NO_FILE", message: "No file uploaded" } });
    const body = await file.toBuffer();
    const fileKey = `imports/${request.auth!.studioId}/${Date.now()}-${file.filename}`;
    await getStorageClient().put(fileKey, body, file.mimetype);
    return { ok: true, data: { fileKey } };
  });

  app.get("/import-jobs", { preHandler: manage }, async (request) => ({ ok: true, data: await imports.listImportJobs(request.auth!.studioId!) }));

  app.get("/import-jobs/:id", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await imports.getImportJob(request.auth!.studioId!, id) };
  });

  app.post("/import-jobs", { preHandler: manage }, async (request) => {
    const body = createImportJobSchema.parse(request.body);
    return { ok: true, data: await imports.createImportJob(request.auth!.studioId!, body.entityType, body.fileKey, request.auth!.actorId) };
  });

  app.get("/import-jobs/:id/suggested-mapping", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await imports.getSuggestedMapping(request.auth!.studioId!, id) };
  });

  app.patch("/import-jobs/:id/mapping", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = setColumnMappingSchema.parse(request.body);
    return { ok: true, data: await imports.setColumnMapping(request.auth!.studioId!, id, body.columnMapping, body.duplicateHandling, request.auth!.actorId) };
  });

  app.get("/import-jobs/:id/preview", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await imports.previewImport(request.auth!.studioId!, id) };
  });

  app.post("/import-jobs/:id/process", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    processImportSchema.parse(request.body);
    return { ok: true, data: await imports.processImport(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/import-jobs/:id/retry", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await imports.retryFailedRows(request.auth!.studioId!, id, request.auth!.actorId) };
  });
}
