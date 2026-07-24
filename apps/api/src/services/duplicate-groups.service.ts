import { prisma } from "@bcp/database";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { computeHammingDistance, classifyDuplicate, similarityScoreFromDistance, resolveReviewTransition } from "@bcp/photo-intelligence";
import { computePerceptualHash, PHASH_BIT_LENGTH } from "./photo-analysis-vision";
import { recordActivity } from "./activity-log.service";

export class DuplicateGroupNotFoundError extends Error {
  readonly code = "DUPLICATE_GROUP_NOT_FOUND";
  constructor() {
    super("Duplicate group not found");
    this.name = "DuplicateGroupNotFoundError";
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
 * Scans every photo in a gallery pairwise by perceptual hash and
 * clusters exact/near duplicates into `DuplicateGroup`s — a simple
 * O(n²) comparison, which is fine at gallery scale (hundreds, not
 * millions, of photos) and avoids needing a vector index for what's
 * ultimately a same-event, same-day photo set. Within each group, the
 * highest `PhotoAnalysis.qualityScore` (when analysis has run) is
 * marked `isBestShot` — "Best-shot suggestion" scoped to a duplicate
 * cluster, per `DuplicateGroupMember`'s schema doc comment.
 */
export async function detectDuplicates(studioId: string, galleryId: string, actorId: string) {
  const photos = await prisma.galleryPhoto.findMany({ where: { studioId, galleryId, isHidden: false }, include: { photoAnalysis: { select: { qualityScore: true } } } });

  const hashes = new Map<string, string>();
  for (const photo of photos) {
    const bytes = await getStorageClient().get(photo.thumbnailKey ?? photo.compressedKey ?? photo.fileKey);
    hashes.set(photo.id, await computePerceptualHash(bytes));
  }

  const visited = new Set<string>();
  const groupsCreated: string[] = [];

  for (const photoA of photos) {
    if (visited.has(photoA.id)) continue;
    const hashA = hashes.get(photoA.id)!;

    const cluster: { photoId: string; distance: number; classification: string }[] = [{ photoId: photoA.id, distance: 0, classification: "exact_duplicate" }];
    for (const photoB of photos) {
      if (photoB.id === photoA.id || visited.has(photoB.id)) continue;
      const distance = computeHammingDistance(hashA, hashes.get(photoB.id)!);
      const classification = classifyDuplicate(distance);
      if (classification !== "not_duplicate") cluster.push({ photoId: photoB.id, distance, classification });
    }

    if (cluster.length < 2) continue; // no duplicates found for this photo — not a group

    for (const member of cluster) visited.add(member.photoId);

    const worstClassification = cluster.some((m) => m.classification === "near_duplicate") ? "near_duplicate" : "exact_duplicate";
    const avgDistance = cluster.reduce((sum, m) => sum + m.distance, 0) / cluster.length;

    const bestShotPhotoId = photos
      .filter((p: { id: string }) => cluster.some((m) => m.photoId === p.id))
      .sort((a: { photoAnalysis: { qualityScore: number } | null }, b: { photoAnalysis: { qualityScore: number } | null }) => (b.photoAnalysis?.qualityScore ?? 0) - (a.photoAnalysis?.qualityScore ?? 0))[0]?.id;

    const group = await prisma.duplicateGroup.create({
      data: {
        studioId,
        galleryId,
        groupType: worstClassification as never,
        confidence: Math.max(0, 100 - avgDistance * 2),
        explanation: `${cluster.length} photos with near-identical visual content (average hash distance ${avgDistance.toFixed(1)} of ${PHASH_BIT_LENGTH} bits).`,
        members: { create: cluster.map((m) => ({ galleryPhotoId: m.photoId, similarityScore: similarityScoreFromDistance(m.distance, PHASH_BIT_LENGTH), isBestShot: m.photoId === bestShotPhotoId })) },
      },
    });
    groupsCreated.push(group.id);
  }

  await recordActivity({ studioId, actorId, action: "duplicate_groups.detected", resourceType: "Gallery", resourceId: galleryId, metadata: { groupCount: groupsCreated.length } });
  return { groupsCreated: groupsCreated.length };
}

export async function listDuplicateGroups(studioId: string, galleryId: string) {
  return prisma.duplicateGroup.findMany({
    where: { studioId, galleryId },
    include: { members: { include: { galleryPhoto: { select: { id: true, thumbnailKey: true, previewKey: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewDuplicateGroup(studioId: string, groupId: string, action: "approve" | "reject", actorId: string) {
  const group = await prisma.duplicateGroup.findFirst({ where: { id: groupId, studioId } });
  if (!group) throw new DuplicateGroupNotFoundError();

  const { newStatus } = resolveReviewTransition(action);
  await prisma.duplicateGroup.update({ where: { id: groupId }, data: { status: newStatus, reviewedByUserId: actorId, reviewedAt: new Date() } });
  await recordActivity({ studioId, actorId, action: `duplicate_group.${newStatus}`, resourceType: "DuplicateGroup", resourceId: groupId });

  return prisma.duplicateGroup.findUnique({ where: { id: groupId }, include: { members: true } });
}

/** Re-picks which member is the suggested best shot within a group — a studio's own manual override of the automatic quality-score pick, not a re-run of the analysis. */
export async function setBestShot(studioId: string, groupId: string, galleryPhotoId: string, actorId: string) {
  const group = await prisma.duplicateGroup.findFirst({ where: { id: groupId, studioId } });
  if (!group) throw new DuplicateGroupNotFoundError();

  await prisma.$transaction([
    prisma.duplicateGroupMember.updateMany({ where: { duplicateGroupId: groupId }, data: { isBestShot: false } }),
    prisma.duplicateGroupMember.updateMany({ where: { duplicateGroupId: groupId, galleryPhotoId }, data: { isBestShot: true } }),
  ]);

  await recordActivity({ studioId, actorId, action: "duplicate_group.best_shot_changed", resourceType: "DuplicateGroup", resourceId: groupId, metadata: { galleryPhotoId } });
  return prisma.duplicateGroup.findUnique({ where: { id: groupId }, include: { members: true } });
}
