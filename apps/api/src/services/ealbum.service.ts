import crypto from "node:crypto";
import { prisma } from "@bcp/database";
import { hashPassword, verifyPassword } from "@bcp/auth";
import { checkEAlbumAccess, type EAlbumSessionState } from "@bcp/album-production";
import { generateOtpCode, isOtpValid } from "@bcp/gallery";
import { AlbumNotFoundError } from "./album-selection.service";
import { sendWhatsAppMessage } from "./whatsapp-sender.service";
import { recordActivity } from "./activity-log.service";

/** Generates (or returns the existing) e-album link — deliberately a separate token from the selection link, since the e-album is typically shared far more widely once the album is finished (the brief specifically names WhatsApp share) than a selection link ever would be. */
export async function ensureEAlbumLink(studioId: string, albumId: string, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();
  if (album.eAlbumToken) return album;

  const updated = await prisma.album.update({ where: { id: albumId }, data: { eAlbumToken: crypto.randomUUID() } });
  await recordActivity({ studioId, actorId, action: "ealbum.link_created", resourceType: "Album", resourceId: albumId });
  return updated;
}

export async function updateEAlbumSettings(studioId: string, albumId: string, input: { password?: string; otpRequired?: boolean; downloadEnabled?: boolean }, actorId: string) {
  const album = await prisma.album.findFirst({ where: { id: albumId, studioId } });
  if (!album) throw new AlbumNotFoundError();

  await prisma.album.update({
    where: { id: albumId },
    data: { eAlbumPasswordHash: input.password ? await hashPassword(input.password) : undefined, eAlbumOtpRequired: input.otpRequired, eAlbumDownloadEnabled: input.downloadEnabled },
  });
  await recordActivity({ studioId, actorId, action: "ealbum.settings_updated", resourceType: "Album", resourceId: albumId });
  return prisma.album.findUnique({ where: { id: albumId } });
}

/** "WhatsApp share" — sends the e-album link directly to a phone number via the platform's own WhatsApp send path (Prompt 24), so sharing is tracked the same way every other outbound message is, not a bare `wa.me` link a studio has to build by hand. */
export async function shareEAlbumViaWhatsApp(studioId: string, albumId: string, toPhone: string, actorId: string) {
  const album = await ensureEAlbumLink(studioId, albumId, actorId);
  const baseUrl = process.env.EALBUM_WEB_BASE_URL ?? "http://localhost:3007";
  const url = `${baseUrl.replace(/\/$/, "")}/${album.eAlbumToken}`;

  await sendWhatsAppMessage(studioId, { to: toPhone, messageType: "text", body: `Your album is ready to view: ${url}`, contextType: "Album", contextId: albumId }, actorId);
  return { sentTo: toPhone, url };
}

// ── Public viewer ────────────────────────────────────────────────────

function newGuestToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

async function resolveByToken(eAlbumToken: string) {
  const album = await prisma.album.findUnique({ where: { eAlbumToken } });
  if (!album) throw new AlbumNotFoundError();
  return album;
}

export async function startEAlbumSession(eAlbumToken: string, existingGuestToken: string | undefined) {
  const album = await resolveByToken(eAlbumToken);
  const studio = await prisma.studio.findUniqueOrThrow({ where: { id: album.studioId }, select: { slug: true, name: true } });

  let session = existingGuestToken ? await prisma.eAlbumAccessSession.findUnique({ where: { guestToken: existingGuestToken } }) : null;
  if (!session || session.albumId !== album.id) session = await prisma.eAlbumAccessSession.create({ data: { albumId: album.id, guestToken: newGuestToken() } });

  const accessResult = checkEAlbumAccess({ passwordHash: album.eAlbumPasswordHash, otpRequired: album.eAlbumOtpRequired }, session as EAlbumSessionState);
  return { album, studio, guestToken: session.guestToken, accessResult, downloadEnabled: album.eAlbumDownloadEnabled };
}

export async function verifyEAlbumPassword(eAlbumToken: string, guestToken: string, password: string) {
  const album = await resolveByToken(eAlbumToken);
  if (!album.eAlbumPasswordHash || !(await verifyPassword(album.eAlbumPasswordHash, password))) throw new Error("Incorrect password");

  await prisma.eAlbumAccessSession.update({ where: { guestToken }, data: { passwordVerified: true, lastSeenAt: new Date() } });
  return { verified: true };
}

export async function requestEAlbumOtp(eAlbumToken: string, guestToken: string, sendEmail: (code: string) => Promise<void>) {
  await resolveByToken(eAlbumToken);
  const code = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.eAlbumAccessSession.update({ where: { guestToken }, data: { otpCode: code, otpExpiresAt } });
  await sendEmail(code);
  return { sent: true };
}

export async function verifyEAlbumOtp(guestToken: string, code: string) {
  const session = await prisma.eAlbumAccessSession.findUnique({ where: { guestToken } });
  if (!session || !isOtpValid(session.otpCode, session.otpExpiresAt, code)) throw new Error("Incorrect or expired code");

  await prisma.eAlbumAccessSession.update({ where: { guestToken }, data: { otpVerified: true, lastSeenAt: new Date() } });
  return { verified: true };
}

async function requireGrantedEAlbumAccess(eAlbumToken: string, guestToken: string) {
  const album = await resolveByToken(eAlbumToken);
  const session = await prisma.eAlbumAccessSession.findUnique({ where: { guestToken } });
  if (!session || session.albumId !== album.id) throw new Error("Access denied");

  const result = checkEAlbumAccess({ passwordHash: album.eAlbumPasswordHash, otpRequired: album.eAlbumOtpRequired }, session as EAlbumSessionState);
  if (result !== "granted") throw new Error(`Access denied: ${result}`);

  return album;
}

/** The page-flip viewer's own content — every current spread, in order, with the studio's branding resolved the same `/public/branding` way every other public surface (gallery, quotation, enquiry form) already does. */
export async function getEAlbumPages(eAlbumToken: string, guestToken: string) {
  const album = await requireGrantedEAlbumAccess(eAlbumToken, guestToken);
  const spreads = await prisma.albumSpread.findMany({ where: { albumId: album.id, isCurrent: true }, orderBy: { spreadNumber: "asc" } });
  return spreads.map((s: { id: string; spreadNumber: number; fileKey: string }) => ({ id: s.id, spreadNumber: s.spreadNumber, fileKey: s.fileKey }));
}

/** "Download control" — a studio can turn e-album downloads off entirely; when on, hands back every current spread's storage key. */
export async function getEAlbumDownloadKeys(eAlbumToken: string, guestToken: string): Promise<string[]> {
  const album = await requireGrantedEAlbumAccess(eAlbumToken, guestToken);
  if (!album.eAlbumDownloadEnabled) throw new Error("Downloads are disabled for this album");

  const spreads = await prisma.albumSpread.findMany({ where: { albumId: album.id, isCurrent: true }, orderBy: { spreadNumber: "asc" }, select: { fileKey: true } });
  return spreads.map((s: { fileKey: string }) => s.fileKey);
}
