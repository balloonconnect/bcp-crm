import crypto from "node:crypto";
import { prisma } from "@bcp/database";
import { generateOtpCode, isOtpValid } from "@bcp/gallery";
import { sendAuthEmail } from "./notify";

export class ClientNotFoundError extends Error {
  readonly code = "CLIENT_NOT_FOUND";
  constructor() {
    super("We couldn't find an account with that email.");
    this.name = "ClientNotFoundError";
  }
}

export class InvalidPortalOtpError extends Error {
  readonly code = "INVALID_PORTAL_OTP";
  constructor() {
    super("Incorrect or expired code.");
    this.name = "InvalidPortalOtpError";
  }
}

export class PortalSessionExpiredError extends Error {
  readonly code = "PORTAL_SESSION_EXPIRED";
  constructor() {
    super("Your session has expired. Please log in again.");
    this.name = "PortalSessionExpiredError";
  }
}

const SESSION_LIFETIME_DAYS = 30;

/**
 * Login is OTP-only, by design — matching every other guest-adjacent
 * flow in this codebase rather than asking a client to invent and
 * remember a password for a portal they might open twice a year. A
 * client is looked up by email within one studio (a person who's a
 * client of two studios in this platform has two entirely separate
 * accounts, which is correct — their relationship, bookings, and data
 * with each studio are genuinely independent).
 */
export async function requestPortalLogin(studioId: string, email: string) {
  const client = await prisma.client.findFirst({ where: { studioId, email, deletedAt: null } });
  if (!client) throw new ClientNotFoundError();

  const code = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const sessionToken = crypto.randomBytes(32).toString("hex");

  await prisma.clientPortalSession.create({
    data: { studioId, clientId: client.id, sessionToken, otpCode: code, otpExpiresAt, expiresAt: new Date(Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000) },
  });

  await sendAuthEmail({ to: email, subject: "Your portal access code", html: `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>` }).catch(() => undefined);

  return { sessionToken };
}

export async function verifyPortalLogin(sessionToken: string, code: string) {
  const session = await prisma.clientPortalSession.findUnique({ where: { sessionToken } });
  if (!session || !isOtpValid(session.otpCode, session.otpExpiresAt, code)) throw new InvalidPortalOtpError();

  await prisma.clientPortalSession.update({ where: { sessionToken }, data: { otpVerified: true, lastSeenAt: new Date() } });
  const client = await prisma.client.findUniqueOrThrow({ where: { id: session.clientId }, select: { id: true, name: true, email: true } });
  return { sessionToken, client };
}

/** Every authenticated portal route resolves the client through this — a session must be OTP-verified and not past its own lifetime (independent of the OTP's own 10-minute expiry, which only gates the login step itself). */
export async function resolvePortalSession(sessionToken: string) {
  const session = await prisma.clientPortalSession.findUnique({ where: { sessionToken } });
  if (!session || !session.otpVerified) throw new PortalSessionExpiredError();
  if (session.expiresAt.getTime() < Date.now()) throw new PortalSessionExpiredError();

  await prisma.clientPortalSession.update({ where: { sessionToken }, data: { lastSeenAt: new Date() } });
  return { studioId: session.studioId, clientId: session.clientId };
}

export async function logoutPortalSession(sessionToken: string) {
  await prisma.clientPortalSession.deleteMany({ where: { sessionToken } });
}
