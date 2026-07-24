import { prisma } from "@bcp/database";
import { getPresetWeights, mergeWeights, resolveCullingRecommendation, rankImportantFaces, type PriorityWeights } from "@bcp/culling";
import { recordActivity } from "./activity-log.service";

export class CullingSessionNotFoundError extends Error {
  readonly code = "CULLING_SESSION_NOT_FOUND";
  constructor() {
    super("Culling session not found");
    this.name = "CullingSessionNotFoundError";
  }
}

function deriveTechnicalIssues(analysis: { isBlurry: boolean; closedEyeDetected: boolean; exposureAssessment: string }): string[] {
  const issues: string[] = [];
  if (analysis.isBlurry) issues.push("blurry");
  if (analysis.closedEyeDetected) issues.push("closed_eyes");
  if (analysis.exposureAssessment !== "good") issues.push(analysis.exposureAssessment);
  return issues;
}

export interface StartCullingSessionInput {
  presetType: string;
  priorityWeightOverrides?: Partial<PriorityWeights>;
  importantFaceIds?: string[];
}

/**
 * Runs one full culling pass over every analyzed, non-hidden photo in
 * a gallery. Requires `@bcp/photo-intelligence`'s analysis (Prompt 29)
 * and duplicate-group detection to have already run — this pipeline
 * *composes* those signals into a keep/drop/review verdict rather than
 * re-detecting blur, faces, or duplicates itself. A photo with no
 * `PhotoAnalysis` yet is simply skipped, not defaulted to any verdict.
 */
export async function startCullingSession(studioId: string, galleryId: string, input: StartCullingSessionInput, actorId: string) {
  const baseWeights = getPresetWeights(input.presetType);
  const weights = input.priorityWeightOverrides ? mergeWeights(baseWeights, input.priorityWeightOverrides) : baseWeights;

  let importantFaceIds = input.importantFaceIds ?? [];
  if (importantFaceIds.length === 0) {
    const collection = await prisma.faceCollection.findUnique({ where: { galleryId } });
    if (collection) {
      const entries = await prisma.faceIndexEntry.findMany({ where: { faceCollectionId: collection.id }, select: { providerFaceId: true, galleryPhotoId: true } });
      importantFaceIds = rankImportantFaces(entries.map((e: { providerFaceId: string; galleryPhotoId: string }) => ({ providerFaceId: e.providerFaceId, galleryPhotoId: e.galleryPhotoId }))).map((f) => f.providerFaceId);
    }
  }

  const session = await prisma.cullingSession.create({
    data: { studioId, galleryId, presetType: input.presetType as never, priorityWeights: weights, importantFaceIds, status: "running", createdBy: actorId },
  });

  const photos = await prisma.galleryPhoto.findMany({ where: { studioId, galleryId, isHidden: false }, include: { photoAnalysis: true } });
  const duplicateMemberships = await prisma.duplicateGroupMember.findMany({ where: { galleryPhoto: { galleryId } }, include: { duplicateGroup: { select: { groupType: true } } } });
  const membershipByPhoto = new Map<string, { isBestShot: boolean; groupType: string }>();
  for (const m of duplicateMemberships as { galleryPhotoId: string; isBestShot: boolean; duplicateGroup: { groupType: string } }[]) membershipByPhoto.set(m.galleryPhotoId, { isBestShot: m.isBestShot, groupType: m.duplicateGroup.groupType });

  const recommendationRows = [];
  for (const photo of photos as { id: string; photoAnalysis: { isBlurry: boolean; closedEyeDetected: boolean; exposureAssessment: string; qualityScore: number; momentTags: string[] } | null }[]) {
    if (!photo.photoAnalysis) continue;

    const membership = membershipByPhoto.get(photo.id);
    const isDuplicateNonBest = Boolean(membership && !membership.isBestShot);
    const isRepeatedPose = Boolean(membership && !membership.isBestShot && membership.groupType === "near_duplicate");

    const verdict = resolveCullingRecommendation(
      { qualityScore: photo.photoAnalysis.qualityScore, technicalIssues: deriveTechnicalIssues(photo.photoAnalysis), isEmotionalMoment: photo.photoAnalysis.momentTags.length > 0, isDuplicateNonBest, isRepeatedPose },
      weights,
    );

    recommendationRows.push({
      cullingSessionId: session.id,
      galleryPhotoId: photo.id,
      recommendation: verdict.recommendation as never,
      confidence: verdict.confidence,
      reason: verdict.reason,
      technicalIssues: deriveTechnicalIssues(photo.photoAnalysis),
      isEmotionalMoment: photo.photoAnalysis.momentTags.length > 0,
      isRepeatedPose,
    });
  }

  if (recommendationRows.length > 0) await prisma.cullingRecommendation.createMany({ data: recommendationRows });
  await prisma.cullingSession.update({ where: { id: session.id }, data: { status: "completed", completedAt: new Date() } });

  await recordActivity({ studioId, actorId, action: "culling_session.completed", resourceType: "Gallery", resourceId: galleryId, metadata: { sessionId: session.id, photoCount: recommendationRows.length } });
  return getCullingSession(studioId, session.id);
}

export async function getCullingSession(studioId: string, sessionId: string) {
  const session = await prisma.cullingSession.findFirst({
    where: { id: sessionId, studioId },
    include: { recommendations: { include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } } } } },
  });
  if (!session) throw new CullingSessionNotFoundError();
  return session;
}

export async function listCullingSessions(studioId: string, galleryId: string) {
  return prisma.cullingSession.findMany({ where: { studioId, galleryId }, orderBy: { createdAt: "desc" } });
}

/** Approve/reject a single recommendation — a studio overriding an `exclude` here is exactly how "Protect emotional moments" and every other AI judgment stays a suggestion, never an automatic action. Never touches `GalleryPhoto` itself. */
export async function reviewRecommendation(studioId: string, recommendationId: string, status: "approved" | "rejected") {
  const recommendation = await prisma.cullingRecommendation.findFirst({ where: { id: recommendationId, cullingSession: { studioId } } });
  if (!recommendation) throw new Error("Recommendation not found");
  return prisma.cullingRecommendation.update({ where: { id: recommendationId }, data: { status } });
}
