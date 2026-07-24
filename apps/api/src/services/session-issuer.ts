import { prisma } from "@bcp/database";
import { signAccessToken, generateOpaqueToken, hashOpaqueToken, type ActorType } from "@bcp/auth";
import { getEnv } from "@bcp/config";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // fallback: 30 days
  const [, amountStr, unit] = match;
  const amount = Number(amountStr);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as "s" | "m" | "h" | "d"];
  return amount * unitMs;
}

/**
 * Creates a Session row and returns a fresh access/refresh token pair.
 * Called on every successful login, OTP verification, and Google OAuth
 * sign-in — one Session per "device" login, which is what device
 * history/logout-all-devices/session listing are built on top of.
 */
export async function issueSession(input: {
  actorId: string;
  actorType: ActorType;
  studioId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<IssuedTokens> {
  const env = getEnv();
  const refreshToken = generateOpaqueToken(32);
  const refreshTtlMs = parseTtlToMs(env.JWT_REFRESH_TTL);
  const expiresAt = new Date(Date.now() + refreshTtlMs);

  const session = await prisma.session.create({
    data: {
      studioId: input.studioId,
      actorType: input.actorType,
      actorId: input.actorId,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt,
    },
  });

  const accessToken = await signAccessToken(
    { sub: input.actorId, actorType: input.actorType, studioId: input.studioId, sessionId: session.id },
    env.AUTH_SECRET,
    env.JWT_ACCESS_TTL,
  );

  return { accessToken, refreshToken, sessionId: session.id, expiresAt };
}

/** Records a LoginHistory row — called on every login attempt, success or failure. */
export async function recordLoginHistory(input: {
  actorId: string;
  actorType: ActorType;
  studioId: string | null;
  success: boolean;
  failureReason?: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  await prisma.loginHistory.create({
    data: {
      actorId: input.actorId,
      actorType: input.actorType,
      studioId: input.studioId,
      success: input.success,
      failureReason: input.failureReason,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
