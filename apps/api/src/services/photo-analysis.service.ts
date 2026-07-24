import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { deriveIsBlurry, computeQualityScore, isGroupPhoto, resolveReviewTransition, resolveUndo } from "@bcp/photo-intelligence";
import { extractQualityStats } from "./photo-analysis-vision";
import { runSemanticAnalysis } from "./photo-analysis-semantic";
import { getFaceProvider } from "./face-provider";
import { recordActivity } from "./activity-log.service";

export class PhotoAnalysisNotFoundError extends Error {
  readonly code = "PHOTO_ANALYSIS_NOT_FOUND";
  constructor() {
    super("Photo analysis not found");
    this.name = "PhotoAnalysisNotFoundError";
  }
}

let storageClient: StorageClient | null = null;
function getStorageClient(): StorageClient {
  if (storageClient) return storageClient;
  const env = getEnv();
  storageClient = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });
  return storageClient;
}

/**
 * Runs the full analysis pipeline for one delivered photo — pixel
 * statistics (blur/exposure/noise, via `sharp`, real and deterministic),
 * face attributes (smile/eyes-open, via the same `FaceRecognitionProvider`
 * abstraction Prompt 28 built, when configured), and the semantic half
 * (composition/scene/moments, via Claude vision, when configured).
 * Each stage degrades independently rather than failing the whole
 * analysis if one provider isn't set up — a studio without AWS
 * credentials still gets real blur/exposure/noise scores, just with
 * `faceCount: 0` and a generic composition assessment.
 */
export async function analyzePhoto(studioId: string, galleryPhotoId: string, actorId: string) {
  const photo = await prisma.galleryPhoto.findFirstOrThrow({ where: { id: galleryPhotoId, studioId } });
  const imageBytes = await getStorageClient().get(photo.compressedKey ?? photo.fileKey);

  const qualityStats = await extractQualityStats(imageBytes);

  let faceCount = 0;
  let smileDetected = false;
  let closedEyeDetected = false;
  const faceProvider = getFaceProvider();
  if (faceProvider) {
    const faces = await faceProvider.detectFaceAttributes(imageBytes);
    faceCount = faces.length;
    smileDetected = faces.some((f) => f.smileDetected);
    closedEyeDetected = faces.some((f) => !f.eyesOpen);
  }

  const semantic = await runSemanticAnalysis(imageBytes, "image/jpeg").catch(() => ({
    compositionScore: 50,
    subjectProminenceScore: 50,
    sceneClassification: "unclassified",
    momentTags: [] as string[],
    explanation: "AI composition analysis wasn't available for this photo; technical quality scores above are still real.",
    confidence: 20,
  }));

  const isBlurry = deriveIsBlurry(qualityStats.sharpnessScore);
  const qualityScore = computeQualityScore({
    sharpnessScore: qualityStats.sharpnessScore,
    exposureScore: qualityStats.exposureScore,
    noiseScore: qualityStats.noiseScore,
    compositionScore: semantic.compositionScore,
    subjectProminenceScore: semantic.subjectProminenceScore,
  });

  const analysis = await prisma.photoAnalysis.upsert({
    where: { galleryPhotoId },
    create: {
      studioId,
      galleryPhotoId,
      blurScore: qualityStats.sharpnessScore,
      isBlurry,
      sharpnessScore: qualityStats.sharpnessScore,
      noiseScore: qualityStats.noiseScore,
      exposureScore: qualityStats.exposureScore,
      exposureAssessment: qualityStats.exposureAssessment as never,
      faceCount,
      closedEyeDetected,
      smileDetected,
      isGroupPhoto: isGroupPhoto(faceCount),
      subjectProminenceScore: semantic.subjectProminenceScore,
      sceneClassification: semantic.sceneClassification,
      momentTags: semantic.momentTags,
      compositionScore: semantic.compositionScore,
      qualityScore,
      confidence: semantic.confidence,
      explanation: semantic.explanation,
    },
    update: {
      blurScore: qualityStats.sharpnessScore,
      isBlurry,
      sharpnessScore: qualityStats.sharpnessScore,
      noiseScore: qualityStats.noiseScore,
      exposureScore: qualityStats.exposureScore,
      exposureAssessment: qualityStats.exposureAssessment as never,
      faceCount,
      closedEyeDetected,
      smileDetected,
      isGroupPhoto: isGroupPhoto(faceCount),
      subjectProminenceScore: semantic.subjectProminenceScore,
      sceneClassification: semantic.sceneClassification,
      momentTags: semantic.momentTags,
      compositionScore: semantic.compositionScore,
      qualityScore,
      confidence: semantic.confidence,
      explanation: semantic.explanation,
      status: "pending",
      reviewedByUserId: null,
      reviewedAt: null,
      analyzedAt: new Date(),
    },
  });

  await recordActivity({ studioId, actorId, action: "photo_analysis.completed", resourceType: "GalleryPhoto", resourceId: galleryPhotoId, metadata: { qualityScore, isBlurry } });
  return analysis;
}

export async function listAnalyses(studioId: string, galleryId: string, filter?: { status?: string; isBlurry?: boolean; closedEyeDetected?: boolean; minQualityScore?: number }) {
  return prisma.photoAnalysis.findMany({
    where: {
      studioId,
      galleryPhoto: { galleryId },
      ...(filter?.status ? { status: filter.status as never } : {}),
      ...(filter?.isBlurry !== undefined ? { isBlurry: filter.isBlurry } : {}),
      ...(filter?.closedEyeDetected !== undefined ? { closedEyeDetected: filter.closedEyeDetected } : {}),
      ...(filter?.minQualityScore !== undefined ? { qualityScore: { gte: filter.minQualityScore } } : {}),
    },
    include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } } },
    orderBy: { qualityScore: "desc" },
  });
}

export async function getAnalysis(studioId: string, analysisId: string) {
  const analysis = await prisma.photoAnalysis.findFirst({ where: { id: analysisId, studioId }, include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } }, reviewLogs: { orderBy: { createdAt: "desc" } } } });
  if (!analysis) throw new PhotoAnalysisNotFoundError();
  return analysis;
}

/** Approve/reject — logs the transition (for undo) but never touches `GalleryPhoto` itself. See `PhotoAnalysis`'s schema doc comment: "do not delete photos automatically" is held here structurally, not just as a policy note. */
export async function reviewAnalysis(studioId: string, analysisId: string, action: "approve" | "reject", actorId: string, batchId?: string) {
  const analysis = await prisma.photoAnalysis.findFirst({ where: { id: analysisId, studioId } });
  if (!analysis) throw new PhotoAnalysisNotFoundError();

  const { newStatus } = resolveReviewTransition(action);

  await prisma.$transaction([
    prisma.photoAnalysis.update({ where: { id: analysisId }, data: { status: newStatus, reviewedByUserId: actorId, reviewedAt: new Date() } }),
    prisma.photoAnalysisReviewLog.create({ data: { studioId, photoAnalysisId: analysisId, action: newStatus === "approved" ? "approved" : "rejected", previousStatus: analysis.status, newStatus, actorId, batchId } }),
  ]);

  return getAnalysis(studioId, analysisId);
}

/** "Bulk review" — every row this creates shares one `batchId`, so a single bulk action is one undoable operation, not N separate ones. */
export async function bulkReview(studioId: string, analysisIds: string[], action: "approve" | "reject", actorId: string) {
  const batchId = crypto.randomUUID();
  const results = [];
  for (const id of analysisIds) results.push(await reviewAnalysis(studioId, id, action, actorId, batchId));
  return { batchId, count: results.length };
}

/** "Undo" — restores whatever `previousStatus` the most recent (non-undone) log entry for this analysis recorded, and logs the undo itself so the trail stays complete. */
export async function undoReview(studioId: string, analysisId: string, actorId: string) {
  const analysis = await prisma.photoAnalysis.findFirst({ where: { id: analysisId, studioId } });
  if (!analysis) throw new PhotoAnalysisNotFoundError();

  const mostRecentLog = await prisma.photoAnalysisReviewLog.findFirst({ where: { photoAnalysisId: analysisId }, orderBy: { createdAt: "desc" } });
  if (!mostRecentLog) throw new Error("Nothing to undo.");

  const restoredStatus = resolveUndo(mostRecentLog);

  await prisma.$transaction([
    prisma.photoAnalysis.update({ where: { id: analysisId }, data: { status: restoredStatus } }),
    prisma.photoAnalysisReviewLog.create({ data: { studioId, photoAnalysisId: analysisId, action: "undone", previousStatus: analysis.status, newStatus: restoredStatus, actorId } }),
  ]);

  return getAnalysis(studioId, analysisId);
}

/** Undoing a whole batch — restores every analysis in the batch to its own individual previous state, not a single shared one, since each photo's history is independent even though they were reviewed together. */
export async function undoBatch(studioId: string, batchId: string, actorId: string) {
  const logs = await prisma.photoAnalysisReviewLog.findMany({ where: { studioId, batchId } });
  const results = [];
  for (const log of logs) results.push(await undoReview(studioId, log.photoAnalysisId, actorId));
  return results;
}
