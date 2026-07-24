import { prisma } from "@bcp/database";
import { canTransition, resolveNextVersionNumber, canApproveFullAlbum } from "@bcp/album-production";
import { AlbumNotFoundError } from "./album-selection.service";
import { recordActivity } from "./activity-log.service";

export class InvalidStageTransitionError extends Error {
  readonly code = "INVALID_STAGE_TRANSITION";
  constructor(from: string, to: string) {
    super(`Can't move from "${from}" to "${to}".`);
    this.name = "InvalidStageTransitionError";
  }
}

export class FullApprovalNotReadyError extends Error {
  readonly code = "FULL_APPROVAL_NOT_READY";
  constructor() {
    super("Every current spread needs to be approved before the whole album can be.");
    this.name = "FullApprovalNotReadyError";
  }
}

export class RevisionLimitReachedError extends Error {
  readonly code = "REVISION_LIMIT_REACHED";
  constructor() {
    super("This album has reached its revision limit.");
    this.name = "RevisionLimitReachedError";
  }
}

async function getCurrentSpreads(albumId: string) {
  return prisma.albumSpread.findMany({ where: { albumId, isCurrent: true }, orderBy: { spreadNumber: "asc" } });
}

export async function assignDesigner(studioId: string, albumId: string, designerId: string, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();
  if (!canTransition(album.productionStage, "designer_assigned") && album.productionStage !== "designer_assigned") throw new InvalidStageTransitionError(album.productionStage, "designer_assigned");

  await prisma.album.update({ where: { id: albumId }, data: { designerId, designerAssignedAt: new Date(), productionStage: "designer_assigned" } });
  await recordActivity({ studioId, actorId, action: "album.designer_assigned", resourceType: "Album", resourceId: albumId, metadata: { designerId } });
  return prisma.album.findUnique({ where: { id: albumId } });
}

export async function transitionStage(studioId: string, albumId: string, toStage: string, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();
  if (!canTransition(album.productionStage, toStage as never)) throw new InvalidStageTransitionError(album.productionStage, toStage);

  await prisma.album.update({ where: { id: albumId }, data: { productionStage: toStage as never } });
  await recordActivity({ studioId, actorId, action: "album.stage_changed", resourceType: "Album", resourceId: albumId, metadata: { stage: toStage } });
  return prisma.album.findUnique({ where: { id: albumId } });
}

/** "Spread upload" + "Versioning" — every upload gets the next version for that spread number, and becomes the new `isCurrent` one in the same transaction the previous current version's flag flips off in. */
export async function uploadSpread(studioId: string, albumId: string, spreadNumber: number, fileKey: string, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();

  const existing = await prisma.albumSpread.findMany({ where: { albumId }, select: { spreadNumber: true, versionNumber: true } });
  const versionNumber = resolveNextVersionNumber(existing, spreadNumber);

  const spread = await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.albumSpread.updateMany({ where: { albumId, spreadNumber, isCurrent: true }, data: { isCurrent: false } });
    return tx.albumSpread.create({ data: { albumId, spreadNumber, versionNumber, fileKey, status: "proof", isCurrent: true, uploadedBy: actorId } });
  });

  if (album.productionStage === "designer_assigned" || album.productionStage === "design_started") {
    await prisma.album.update({ where: { id: albumId }, data: { productionStage: "proof_uploaded" } });
  }

  await recordActivity({ studioId, actorId, action: "album.spread_uploaded", resourceType: "Album", resourceId: albumId, metadata: { spreadNumber, versionNumber } });
  return spread;
}

export async function listSpreads(studioId: string, albumId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();
  return prisma.albumSpread.findMany({ where: { albumId }, orderBy: [{ spreadNumber: "asc" }, { versionNumber: "asc" }], include: { comments: true, approvals: true } });
}

/** "Full album approval" — checked against every current spread's own approval status, not a separate whole-album checkbox a studio could set regardless of unresolved page feedback. */
export async function approveFullAlbum(studioId: string, albumId: string, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();

  const currentSpreads = await getCurrentSpreads(albumId);
  if (!canApproveFullAlbum(currentSpreads)) throw new FullApprovalNotReadyError();

  await prisma.album.update({ where: { id: albumId }, data: { fullyApprovedAt: new Date(), productionStage: "approved" } });
  await recordActivity({ studioId, actorId, action: "album.fully_approved", resourceType: "Album", resourceId: albumId });
  return prisma.album.findUnique({ where: { id: albumId } });
}

// ── Print orders ─────────────────────────────────────────────────────

export async function createPrintOrder(studioId: string, albumId: string, input: { copies?: number; printSpecification?: Record<string, string>; labName?: string; labContactName?: string; labContactPhone?: string; labContactEmail?: string; notes?: string }, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();

  const order = await prisma.printOrder.create({ data: { studioId, albumId, ...input } });
  await prisma.album.update({ where: { id: albumId }, data: { productionStage: "sent_to_print", status: "printing" } });
  await recordActivity({ studioId, actorId, action: "print_order.created", resourceType: "Album", resourceId: albumId, metadata: { printOrderId: order.id } });
  return order;
}

export async function markPrintOrderStatus(studioId: string, printOrderId: string, status: string, actorId: string) {
  const order = await prisma.printOrder.findFirst({ where: { id: printOrderId, studioId } });
  if (!order) throw new Error("Print order not found");

  await prisma.printOrder.update({ where: { id: printOrderId }, data: { status: status as never, completedAt: status === "completed" ? new Date() : undefined } });
  if (status === "completed") await prisma.album.update({ where: { id: order.albumId }, data: { productionStage: "printed" } });

  await recordActivity({ studioId, actorId, action: "print_order.status_changed", resourceType: "PrintOrder", resourceId: printOrderId, metadata: { status } });
  return prisma.printOrder.findUnique({ where: { id: printOrderId } });
}

/** "Courier tracking" — dispatching a print order also advances the album's own production stage, so a studio never has to update both separately. */
export async function dispatchPrintOrder(studioId: string, printOrderId: string, courierName: string, trackingNumber: string, actorId: string) {
  const order = await prisma.printOrder.findFirst({ where: { id: printOrderId, studioId } });
  if (!order) throw new Error("Print order not found");

  await prisma.$transaction([
    prisma.printOrder.update({ where: { id: printOrderId }, data: { courierName, trackingNumber, dispatchedAt: new Date() } }),
    prisma.album.update({ where: { id: order.albumId }, data: { productionStage: "dispatched" } }),
  ]);

  await recordActivity({ studioId, actorId, action: "print_order.dispatched", resourceType: "PrintOrder", resourceId: printOrderId, metadata: { courierName, trackingNumber } });
  return prisma.printOrder.findUnique({ where: { id: printOrderId } });
}

export async function markPrintOrderDelivered(studioId: string, printOrderId: string, actorId: string) {
  const order = await prisma.printOrder.findFirst({ where: { id: printOrderId, studioId } });
  if (!order) throw new Error("Print order not found");

  await prisma.$transaction([
    prisma.printOrder.update({ where: { id: printOrderId }, data: { deliveredAt: new Date() } }),
    prisma.album.update({ where: { id: order.albumId }, data: { productionStage: "delivered", status: "completed" } }),
  ]);

  await recordActivity({ studioId, actorId, action: "print_order.delivered", resourceType: "PrintOrder", resourceId: printOrderId });
  return prisma.printOrder.findUnique({ where: { id: printOrderId } });
}

export async function listPrintOrders(studioId: string, albumId?: string) {
  return prisma.printOrder.findMany({ where: { studioId, ...(albumId ? { albumId } : {}) }, orderBy: { orderedAt: "desc" } });
}
