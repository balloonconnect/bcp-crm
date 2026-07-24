import { prisma } from "@bcp/database";
import { assertConsented, filterByConfidence, evaluateCaptureQuality } from "@bcp/face-recognition";
import { assertWithinPlanLimit, recordUsage } from "./plan-limit-enforcement";
import { getFaceProvider } from "./face-provider";
import { FaceProviderNotConfiguredError } from "./face-collections.service";

export class FaceSearchNotFoundError extends Error {
  readonly code = "FACE_SEARCH_NOT_FOUND";
  constructor() {
    super("Face search session not found");
    this.name = "FaceSearchNotFoundError";
  }
}

export class FaceSearchNotEnabledError extends Error {
  readonly code = "FACE_SEARCH_NOT_ENABLED";
  constructor() {
    super("Face search isn't enabled for this gallery.");
    this.name = "FaceSearchNotEnabledError";
  }
}

/** "Consent must be recorded" — a `FaceConsentLog` row is written the moment a guest accepts the privacy notice, independent of whether they go on to actually run a search. */
export async function recordConsent(studioId: string, galleryId: string, guestToken: string, consentText: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
  return prisma.faceConsentLog.create({ data: { studioId, galleryId, guestToken, consentText, ipAddress: requestMeta.ipAddress, userAgent: requestMeta.userAgent } });
}

async function mostRecentConsent(galleryId: string, guestToken: string) {
  return prisma.faceConsentLog.findFirst({ where: { galleryId, guestToken }, orderBy: { consentedAt: "desc" } });
}

/** Checks capture quality *before* committing to a search — a guest sees the multiple-face/low-light warning and can retake without a search (and its usage-metered cost) ever being attempted. */
export async function checkCaptureQuality(imageBytes: Buffer) {
  const provider = getFaceProvider();
  if (!provider) throw new FaceProviderNotConfiguredError();

  const { faceCount, quality } = await provider.detectFaces(imageBytes);
  return evaluateCaptureQuality({ faceCount, brightness: quality?.brightness ?? null });
}

/**
 * The full guest-facing search flow — consent is asserted first, the
 * capture's quality is (re-)evaluated and recorded on the session for
 * audit purposes, and only if the guest explicitly proceeded past any
 * warning does an actual provider search run. The image bytes passed
 * in are never written to any persistent storage at any point in this
 * function — processed in memory for the duration of the request and
 * then simply out of scope — which is the strongest possible reading
 * of "selfies must not remain permanently." `selfieDeletedAt` records
 * the moment that's true, immediately once processing finishes.
 */
export async function runFaceSearch(
  studioId: string,
  galleryId: string,
  input: { guestToken: string; mode: "live_scan" | "selfie_upload"; imageBytes: Buffer; proceedDespiteWarning?: boolean },
) {
  const gallery = await prisma.gallery.findFirstOrThrow({ where: { id: galleryId, studioId } });
  if (!gallery.faceSearchEnabled) throw new FaceSearchNotEnabledError();

  const consent = await mostRecentConsent(galleryId, input.guestToken);
  assertConsented(consent?.consentedAt ?? null);

  await assertWithinPlanLimit(studioId, "maxAiFaceSearchesPerMonth");

  const provider = getFaceProvider();
  if (!provider) throw new FaceProviderNotConfiguredError();

  const collection = await prisma.faceCollection.findUnique({ where: { galleryId } });

  const session = await prisma.faceSearchSession.create({
    data: { studioId, galleryId, guestToken: input.guestToken, mode: input.mode, status: "detecting", confidenceThreshold: gallery.faceSearchConfidenceThreshold, consentedAt: consent!.consentedAt },
  });

  try {
    const { faceCount, quality } = await provider.detectFaces(input.imageBytes);
    const captureQuality = evaluateCaptureQuality({ faceCount, brightness: quality?.brightness ?? null });

    await prisma.faceSearchSession.update({ where: { id: session.id }, data: { detectedFaceCount: faceCount, lowLightWarning: captureQuality.lowLightWarning } });

    const hasBlockingWarning = captureQuality.noFaceDetected || captureQuality.multipleFacesWarning || captureQuality.lowLightWarning;
    if (hasBlockingWarning && !input.proceedDespiteWarning) {
      await prisma.faceSearchSession.update({ where: { id: session.id }, data: { status: "failed", failureReason: captureQuality.noFaceDetected ? "no_face_detected" : "capture_quality_warning", selfieDeletedAt: new Date() } });
      return { session: await prisma.faceSearchSession.findUniqueOrThrow({ where: { id: session.id } }), captureQuality, matches: [] };
    }

    if (!collection) {
      await prisma.faceSearchSession.update({ where: { id: session.id }, data: { status: "no_match", selfieDeletedAt: new Date() } });
      return { session: await prisma.faceSearchSession.findUniqueOrThrow({ where: { id: session.id } }), captureQuality, matches: [] };
    }

    await prisma.faceSearchSession.update({ where: { id: session.id }, data: { status: "searching" } });
    const rawMatches = await provider.searchFacesByImage(collection.providerCollectionId, input.imageBytes, 50);
    const filtered = filterByConfidence(rawMatches, gallery.faceSearchConfidenceThreshold);

    const indexEntries = await prisma.faceIndexEntry.findMany({ where: { providerFaceId: { in: filtered.map((m) => m.providerFaceId) } }, select: { providerFaceId: true, galleryPhotoId: true } });
    const photoIdByFaceId = new Map<string, string>(indexEntries.map((e: { providerFaceId: string; galleryPhotoId: string }) => [e.providerFaceId, e.galleryPhotoId]));

    const matchedPhotoIds = new Set<string>();
    const matchData: { galleryPhotoId: string; confidence: number }[] = [];
    for (const m of filtered) {
      const photoId = photoIdByFaceId.get(m.providerFaceId);
      if (!photoId || matchedPhotoIds.has(photoId)) continue;
      matchedPhotoIds.add(photoId);
      matchData.push({ galleryPhotoId: photoId, confidence: m.confidence });
    }

    if (matchData.length > 0) await prisma.faceSearchMatch.createMany({ data: matchData.map((m) => ({ faceSearchSessionId: session.id, galleryPhotoId: m.galleryPhotoId, confidence: m.confidence })) });

    await prisma.faceSearchSession.update({ where: { id: session.id }, data: { status: matchData.length > 0 ? "completed" : "no_match", completedAt: new Date(), selfieDeletedAt: new Date() } });
    await recordUsage(studioId, "maxAiFaceSearchesPerMonth");

    const matches = await prisma.faceSearchMatch.findMany({ where: { faceSearchSessionId: session.id }, include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } } } });
    return { session: await prisma.faceSearchSession.findUniqueOrThrow({ where: { id: session.id } }), captureQuality, matches };
  } catch (error) {
    await prisma.faceSearchSession.update({ where: { id: session.id }, data: { status: "failed", failureReason: error instanceof Error ? error.message : "Search failed", selfieDeletedAt: new Date() } });
    throw error;
  }
}

export async function getFaceSearchResults(studioId: string, sessionId: string) {
  const session = await prisma.faceSearchSession.findFirst({
    where: { id: sessionId, studioId },
    include: { matches: { include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } } } } },
  });
  if (!session) throw new FaceSearchNotFoundError();
  return session;
}

/** "Manual correction" — a guest (or the studio, reviewing on their behalf) marking a suggested match as wrong. Never touches the underlying face index or retrains anything; it's purely a correction flag on this one session's result. */
export async function correctMatch(studioId: string, sessionId: string, matchId: string, isCorrect: boolean) {
  const session = await prisma.faceSearchSession.findFirst({ where: { id: sessionId, studioId } });
  if (!session) throw new FaceSearchNotFoundError();

  if (!isCorrect) await prisma.faceSearchMatch.delete({ where: { id: matchId } });
  else await prisma.faceSearchMatch.update({ where: { id: matchId }, data: { manuallyCorrected: true } });

  return getFaceSearchResults(studioId, sessionId);
}
