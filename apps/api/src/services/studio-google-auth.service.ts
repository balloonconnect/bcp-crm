import { prisma } from "@bcp/database";
import { buildGoogleAuthorizeUrl, exchangeGoogleAuthCode, generateOpaqueToken, type GoogleOAuthConfig } from "@bcp/auth";
import { getEnv } from "@bcp/config";
import { issueSession, recordLoginHistory, type IssuedTokens } from "./session-issuer";
import type { RequestMeta } from "./studio-auth.service";

function oauthConfig(): GoogleOAuthConfig {
  const env = getEnv();
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error("Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI)");
  }
  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
  };
}

/**
 * `state` must encode which studio this sign-in is for (e.g.
 * `${studioId}.${csrfNonce}`) — Google's redirect has no room for our own
 * query params, so the studio context has to round-trip through `state`,
 * itself CSRF-protected by a server-side nonce the caller is responsible
 * for storing and checking against `state` on callback.
 */
export function startGoogleSignIn(studioSlug: string): { url: string; state: string } {
  const state = `${studioSlug}.${generateOpaqueToken(16)}`;
  return { url: buildGoogleAuthorizeUrl(oauthConfig(), state), state };
}

export class GoogleSignInError extends Error {
  readonly code = "GOOGLE_SIGNIN_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "GoogleSignInError";
  }
}

export async function completeGoogleSignIn(input: {
  code: string;
  studioId: string;
  meta: RequestMeta;
}): Promise<IssuedTokens> {
  const profile = await exchangeGoogleAuthCode(oauthConfig(), input.code);
  if (!profile.emailVerified) {
    throw new GoogleSignInError("Google account email is not verified");
  }

  let user = await prisma.studioUser.findFirst({
    where: { studioId: input.studioId, googleSubject: profile.subject },
  });

  if (!user) {
    // Fall back to matching by email (an invited user signing in with
    // Google for the first time) and link the Google account to it.
    const existingByEmail = await prisma.studioUser.findUnique({
      where: { studioId_email: { studioId: input.studioId, email: profile.email } },
    });

    if (existingByEmail) {
      user = await prisma.studioUser.update({
        where: { id: existingByEmail.id },
        data: {
          googleSubject: profile.subject,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
        },
      });
    } else {
      throw new GoogleSignInError(
        "No account with this email exists for this studio — ask an admin to invite you first",
      );
    }
  }

  if (user.deletedAt || user.status !== "active") {
    throw new GoogleSignInError("This account is not active");
  }

  await prisma.studioUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordLoginHistory({
    actorId: user.id,
    actorType: "studio_user",
    studioId: input.studioId,
    success: true,
    ...input.meta,
  });

  return issueSession({ actorId: user.id, actorType: "studio_user", studioId: input.studioId, ...input.meta });
}
