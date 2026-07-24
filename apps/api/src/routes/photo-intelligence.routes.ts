import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { reviewActionSchema, bulkReviewSchema, duplicateGroupReviewSchema, setBestShotSchema, analysisFilterSchema } from "@bcp/photo-intelligence";
import { requireStudioPermission } from "../plugins/auth-guard";
import * as photoAnalysis from "../services/photo-analysis.service";
import * as duplicateGroups from "../services/duplicate-groups.service";

const galleryParamsSchema = z.object({ galleryId: z.string().uuid() });
const idParamsSchema = z.object({ id: z.string().uuid() });
const photoParamsSchema = z.object({ galleryId: z.string().uuid(), photoId: z.string().uuid() });

export async function photoIntelligenceRoutes(app: FastifyInstance) {
  const manage = [app.authenticate, requireStudioPermission("gallery:manage")];
  const view = [app.authenticate, requireStudioPermission("gallery:view")];

  // ── Analysis ─────────────────────────────────────────────────────────
  app.post("/galleries/:galleryId/photos/:photoId/analyze", { preHandler: manage }, async (request) => {
    const { photoId } = photoParamsSchema.parse(request.params);
    return { ok: true, data: await photoAnalysis.analyzePhoto(request.auth!.studioId!, photoId, request.auth!.actorId) };
  });

  app.get("/galleries/:galleryId/photo-analyses", { preHandler: view }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    const query = analysisFilterSchema.parse(request.query);
    return { ok: true, data: await photoAnalysis.listAnalyses(request.auth!.studioId!, galleryId, query) };
  });

  app.get("/photo-analyses/:id", { preHandler: view }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await photoAnalysis.getAnalysis(request.auth!.studioId!, id) };
  });

  // ── Approve / reject / undo / bulk review ────────────────────────────
  app.post("/photo-analyses/:id/review", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { action } = reviewActionSchema.parse(request.body);
    return { ok: true, data: await photoAnalysis.reviewAnalysis(request.auth!.studioId!, id, action, request.auth!.actorId) };
  });

  app.post("/photo-analyses/:id/undo", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return { ok: true, data: await photoAnalysis.undoReview(request.auth!.studioId!, id, request.auth!.actorId) };
  });

  app.post("/photo-analyses/bulk-review", { preHandler: manage }, async (request) => {
    const body = bulkReviewSchema.parse(request.body);
    return { ok: true, data: await photoAnalysis.bulkReview(request.auth!.studioId!, body.photoAnalysisIds, body.action, request.auth!.actorId) };
  });

  app.post("/photo-analyses/bulk-undo/:batchId", { preHandler: manage }, async (request) => {
    const { batchId } = z.object({ batchId: z.string().uuid() }).parse(request.params);
    return { ok: true, data: await photoAnalysis.undoBatch(request.auth!.studioId!, batchId, request.auth!.actorId) };
  });

  // ── Duplicate / near-duplicate groups ────────────────────────────────
  app.post("/galleries/:galleryId/duplicate-groups/detect", { preHandler: manage }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await duplicateGroups.detectDuplicates(request.auth!.studioId!, galleryId, request.auth!.actorId) };
  });

  app.get("/galleries/:galleryId/duplicate-groups", { preHandler: view }, async (request) => {
    const { galleryId } = galleryParamsSchema.parse(request.params);
    return { ok: true, data: await duplicateGroups.listDuplicateGroups(request.auth!.studioId!, galleryId) };
  });

  app.post("/duplicate-groups/:id/review", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { action } = duplicateGroupReviewSchema.parse(request.body);
    return { ok: true, data: await duplicateGroups.reviewDuplicateGroup(request.auth!.studioId!, id, action, request.auth!.actorId) };
  });

  app.post("/duplicate-groups/:id/best-shot", { preHandler: manage }, async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const { galleryPhotoId } = setBestShotSchema.parse(request.body);
    return { ok: true, data: await duplicateGroups.setBestShot(request.auth!.studioId!, id, galleryPhotoId, request.auth!.actorId) };
  });
}
