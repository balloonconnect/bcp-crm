import { prisma } from "@bcp/database";
import { hashOpaqueToken, signAccessToken, generateOpaqueToken } from "@bcp/auth";
import { getEnv } from "@bcp/config";
import type { IssuedTokens } from "./session-issuer";

export class InvalidRefreshTokenError extends Error {
  readonly code = "INVALID_REFRESH_TOKEN";
  constructor() {
    super("Refresh token is invalid, expired, or revoked");
    this.name = "InvalidRefreshTokenError";
  }
}

/**
 * Rotates the refresh token on every use (the old one is invalidated by
 * replacing its hash) — if a stolen refresh token is ever replayed after
 * the legitimate client has already rotated it, the hash won't match
 * anything and the theft is at least contained to a single use.
 */
export async function refreshSession(presentedRefreshToken: string): Promise<IssuedTokens> {
  const refreshTokenHash = hashOpaqueToken(presentedRefreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash } });

  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw new InvalidRefreshTokenError();
  }

  const env = getEnv();
  const newRefreshToken = generateOpaqueToken(32);

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashOpaqueToken(newRefreshToken) },
  });

  const accessToken = await signAccessToken(
    { sub: updated.actorId, actorType: updated.actorType, studioId: updated.studioId, sessionId: updated.id },
    env.AUTH_SECRET,
    env.JWT_ACCESS_TTL,
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: updated.id,
    expiresAt: updated.expiresAt,
  };
}

export async function logout(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
