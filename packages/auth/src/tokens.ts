import { SignJWT, jwtVerify } from "jose";
import type { ActorType } from "./types";

/**
 * Claims carried in the short-lived access token. Deliberately minimal:
 * `studioId` here is the studio the session was *established* against at
 * login — it is one input to tenant resolution, never the sole source of
 * truth. See tenant-resolution.ts and docs/authentication.md § "Never
 * trust studioId from the browser" for why every request still re-verifies
 * this against the caller's actual membership before using it.
 */
export interface SessionClaims {
  /** The actor's id (PlatformUser.id or StudioUser.id). */
  sub: string;
  actorType: ActorType;
  studioId: string | null;
  /** Session.id — lets a request check the session hasn't been revoked. */
  sessionId: string;
}

export async function signAccessToken(
  claims: SessionClaims,
  secret: string,
  ttl: string,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key);
}

export async function verifyAccessToken(token: string, secret: string): Promise<SessionClaims> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as SessionClaims;
}
