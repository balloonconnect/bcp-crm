import { prisma } from "@bcp/database";
import { hasReachedRevisionLimit, resolveNextRoundNumber } from "@bcp/album-production";
import { AlbumNotFoundError } from "./album-selection.service";
import { RevisionLimitReachedError } from "./album-production.service";

/** Reuses the same `AlbumAccessSession`/`guestToken` Prompt 31's selection flow already established for this album — a client reviewing their album's design proofs is a continuation of the same relationship with the same album, not a separate access grant to build and verify again. */
async function requireGrantedAccess(publicToken: string, guestToken: string) {
  const album = await prisma.album.findUnique({ where: { publicToken } });
  if (!album) throw new AlbumNotFoundError();

  const session = await prisma.albumAccessSession.findUnique({ where: { guestToken } });
  if (!session || session.albumId !== album.id) throw new Error("Access denied");
  if (album.otpRequired && !session.otpVerified) throw new Error("OTP verification required");

  return { album, session };
}

export async function listSpreadsForClient(publicToken: string, guestToken: string) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  const spreads = await prisma.albumSpread.findMany({ where: { albumId: album.id, isCurrent: true }, orderBy: { spreadNumber: "asc" }, include: { comments: true } });
  return spreads;
}

/** "Page comments" and "Annotation" together — a position given means a pinned annotation, omitted means a general page comment. */
export async function addSpreadComment(publicToken: string, guestToken: string, albumSpreadId: string, input: { body: string; positionX?: number; positionY?: number }) {
  await requireGrantedAccess(publicToken, guestToken);
  return prisma.albumSpreadComment.create({ data: { albumSpreadId, body: input.body, positionX: input.positionX, positionY: input.positionY, authorType: "client", guestToken } });
}

/** "Page approval" — a client's verdict on one specific spread; a `revision_requested` verdict here is what actually moves the album's own production stage backward into the revision loop. */
export async function submitSpreadApproval(publicToken: string, guestToken: string, albumSpreadId: string, status: "approved" | "revision_requested", comment: string | undefined) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);

  const spread = await prisma.albumSpread.findFirst({ where: { id: albumSpreadId, albumId: album.id } });
  if (!spread) throw new AlbumNotFoundError();

  await prisma.$transaction([
    prisma.albumSpreadApproval.create({ data: { albumSpreadId, status, comment, guestToken } }),
    prisma.albumSpread.update({ where: { id: albumSpreadId }, data: { status } }),
  ]);

  if (status === "revision_requested" && album.productionStage !== "revision_requested") {
    await prisma.album.update({ where: { id: album.id }, data: { productionStage: "revision_requested" } });
  } else if (album.productionStage === "proof_uploaded") {
    await prisma.album.update({ where: { id: album.id }, data: { productionStage: "client_review" } });
  }

  return prisma.albumSpread.findUnique({ where: { id: albumSpreadId }, include: { approvals: true } });
}

/** "Revision requested" as a client-initiated action, checked against "Revision limits" before it's allowed to consume a round. */
export async function requestRevision(publicToken: string, guestToken: string, notes: string) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);

  const roundsRequestedSoFar = await prisma.albumRevisionRequest.count({ where: { albumId: album.id } });
  if (hasReachedRevisionLimit(album, roundsRequestedSoFar)) throw new RevisionLimitReachedError();

  const roundNumber = resolveNextRoundNumber(roundsRequestedSoFar);
  const request = await prisma.$transaction(async (tx: typeof prisma) => {
    const created = await tx.albumRevisionRequest.create({ data: { albumId: album.id, roundNumber, notes, guestToken } });
    await tx.album.update({ where: { id: album.id }, data: { productionStage: "revision_requested" } });
    return created;
  });

  return request;
}

export async function getRevisionStatus(publicToken: string, guestToken: string) {
  const { album } = await requireGrantedAccess(publicToken, guestToken);
  const roundsRequestedSoFar = await prisma.albumRevisionRequest.count({ where: { albumId: album.id } });
  return { roundsUsed: roundsRequestedSoFar, revisionLimit: album.revisionLimit, limitReached: hasReachedRevisionLimit(album, roundsRequestedSoFar) };
}
