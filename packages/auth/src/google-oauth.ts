import { OAuth2Client } from "google-auth-library";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleProfile {
  /** Stable Google account id — store as `googleSubject` on PlatformUser/StudioUser. */
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

function client(config: GoogleOAuthConfig): OAuth2Client {
  return new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
}

/** Builds the URL to redirect the browser to for the Google consent screen. */
export function buildGoogleAuthorizeUrl(config: GoogleOAuthConfig, state: string): string {
  return client(config).generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

/** Exchanges the authorization code from the callback for a verified profile. */
export async function exchangeGoogleAuthCode(
  config: GoogleOAuthConfig,
  code: string,
): Promise<GoogleProfile> {
  const oauthClient = client(config);
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token for this authorization code");
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google id_token payload is missing required fields");
  }

  return {
    subject: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? payload.email,
    avatarUrl: payload.picture ?? null,
  };
}
