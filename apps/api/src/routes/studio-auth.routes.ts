import type { FastifyInstance, FastifyReply } from "fastify";
import {
  signInSchema,
  acceptInvitationSchema,
  twoFactorChallengeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshTokenSchema,
  verifyEmailConfirmSchema,
  revokeSessionSchema,
  twoFactorVerifySchema,
  twoFactorDisableSchema,
} from "@bcp/validation";
import { AUTH_RATE_LIMITS, generateCsrfToken, verifyCsrfToken } from "@bcp/auth";
import * as studioAuth from "../services/studio-auth.service";
import * as twoFactor from "../services/studio-two-factor.service";
import * as sessions from "../services/studio-sessions.service";
import * as refreshService from "../services/refresh.service";
import * as googleAuth from "../services/studio-google-auth.service";
import { resolveStudioIdForAuth } from "../services/resolve-studio-for-auth";
import { toRouteRateLimit, byEmailInBody } from "../plugins/rate-limit-auth";

const REFRESH_COOKIE = "bcp_refresh_token";
const CSRF_COOKIE = "bcp_csrf_token";

function requestMeta(request: { ip: string; headers: Record<string, unknown> }) {
  return {
    ipAddress: request.ip,
    userAgent: typeof request.headers["user-agent"] === "string" ? (request.headers["user-agent"] as string) : null,
  };
}

export async function studioAuthRoutes(app: FastifyInstance) {
  async function requireStudio(request: { hostname: string; body: unknown }): Promise<string> {
    const body = request.body as { studioSlug?: string };
    const studioId = await resolveStudioIdForAuth({ hostname: request.hostname, studioSlug: body?.studioSlug });
    if (!studioId) {
      throw Object.assign(new Error("Could not determine which studio this request is for"), {
        statusCode: 400,
        code: "STUDIO_NOT_RESOLVED",
      });
    }
    return studioId;
  }

  function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      expires: expiresAt,
    });
    // Deliberately NOT httpOnly — this is the CSRF double-submit token; same-origin JS reads it
    // and echoes it back as X-CSRF-Token, which cross-site forged requests have no way to do.
    reply.setCookie(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      expires: expiresAt,
    });
  }

  // ── Signup (accept invitation) ─────────────────────────────────────
  app.post("/auth/accept-invitation", async (request, reply) => {
    const body = acceptInvitationSchema.parse(request.body);
    const tokens = await studioAuth.acceptInvitation({ ...body, meta: requestMeta(request) });
    setRefreshCookie(reply, tokens.refreshToken, tokens.expiresAt);
    return { ok: true, data: { accessToken: tokens.accessToken } };
  });

  // ── Login ────────────────────────────────────────────────────────────
  app.post(
    "/auth/login",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.loginPerAccount, byEmailInBody) },
    async (request, reply) => {
      const body = signInSchema.parse(request.body);
      const studioId = await requireStudio(request);

      try {
        const result = await studioAuth.login({ ...body, studioId, meta: requestMeta(request) });
        setRefreshCookie(reply, result.refreshToken, result.expiresAt);
        return { ok: true, data: { accessToken: result.accessToken } };
      } catch (err) {
        if (err instanceof studioAuth.TwoFactorRequiredError) {
          return reply.send({ ok: true, data: { requiresTwoFactor: true, challengeToken: err.challengeToken } });
        }
        throw err;
      }
    },
  );

  app.post(
    "/auth/2fa/challenge",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.twoFactorVerifyPerAccount) },
    async (request, reply) => {
      const body = twoFactorChallengeSchema.parse(request.body);
      const result = await studioAuth.completeTwoFactorLogin({ ...body, meta: requestMeta(request) });
      setRefreshCookie(reply, result.refreshToken, result.expiresAt);
      return { ok: true, data: { accessToken: result.accessToken } };
    },
  );

  // ── Token refresh / logout ──────────────────────────────────────────
  app.post("/auth/refresh", async (request, reply) => {
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const bodyToken = refreshTokenSchema.safeParse(request.body).data?.refreshToken;
    const presented = cookieToken ?? bodyToken;
    if (!presented) {
      return reply.status(401).send({ ok: false, error: { code: "NO_REFRESH_TOKEN", message: "No refresh token presented" } });
    }
    // CSRF double-submit check — only meaningful (and only enforced) for the cookie path: a cross-site
    // form can make the browser attach the refresh cookie automatically, but can't read or supply the
    // matching CSRF header, which only same-origin JS can. A caller presenting the refresh token
    // directly in the body is an explicit API client, not a browser auto-submission, so it's exempt.
    if (cookieToken) {
      const csrfCookie = (request.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
      const csrfHeader = request.headers["x-csrf-token"];
      if (!verifyCsrfToken(csrfCookie, typeof csrfHeader === "string" ? csrfHeader : undefined)) {
        return reply.status(403).send({ ok: false, error: { code: "CSRF_TOKEN_MISMATCH", message: "Missing or invalid CSRF token" } });
      }
    }
    const result = await refreshService.refreshSession(presented);
    setRefreshCookie(reply, result.refreshToken, result.expiresAt);
    return { ok: true, data: { accessToken: result.accessToken } };
  });

  app.post("/auth/logout", { preHandler: [app.authenticate] }, async (request, reply) => {
    await refreshService.logout(request.auth!.sessionId);
    reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    reply.clearCookie(CSRF_COOKIE, { path: "/auth" });
    return { ok: true, data: null };
  });

  app.post("/auth/logout-all", { preHandler: [app.authenticate] }, async (request, reply) => {
    const auth = request.auth!;
    const count = await sessions.revokeAllSessions(auth.actorId, auth.studioId!, auth.sessionId);
    reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    return { ok: true, data: { revokedCount: count } };
  });

  // ── Sessions (device history) & login history ───────────────────────
  app.get("/auth/sessions", { preHandler: [app.authenticate] }, async (request) => {
    const auth = request.auth!;
    return { ok: true, data: await sessions.listSessions(auth.actorId, auth.studioId!) };
  });

  app.delete("/auth/sessions/:sessionId", { preHandler: [app.authenticate] }, async (request) => {
    const { sessionId } = revokeSessionSchema.parse(request.params);
    const auth = request.auth!;
    await sessions.revokeSession(auth.actorId, auth.studioId!, sessionId);
    return { ok: true, data: null };
  });

  app.get("/auth/login-history", { preHandler: [app.authenticate] }, async (request) => {
    const auth = request.auth!;
    return { ok: true, data: await sessions.listLoginHistory(auth.actorId, auth.studioId!) };
  });

  // ── Email verification ──────────────────────────────────────────────
  app.post("/auth/verify-email/request", { preHandler: [app.authenticate] }, async (request) => {
    const auth = request.auth!;
    await studioAuth.requestEmailVerification(auth.actorId, auth.studioId!);
    return { ok: true, data: null };
  });

  app.post("/auth/verify-email/confirm", async (request) => {
    const { token } = verifyEmailConfirmSchema.parse(request.body);
    await studioAuth.confirmEmailVerification(token);
    return { ok: true, data: null };
  });

  // ── Forgot / reset password ─────────────────────────────────────────
  app.post(
    "/auth/forgot-password",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.passwordResetRequestPerAccount, byEmailInBody) },
    async (request) => {
      const body = forgotPasswordSchema.parse(request.body);
      const studioId = await requireStudio(request);
      await studioAuth.requestPasswordReset(body.email, studioId, requestMeta(request));
      return { ok: true, data: null }; // always OK — never reveals account existence
    },
  );

  app.post("/auth/reset-password", async (request) => {
    const body = resetPasswordSchema.parse(request.body);
    await studioAuth.resetPassword(body.token, body.password);
    return { ok: true, data: null };
  });

  // ── Passwordless email OTP ──────────────────────────────────────────
  app.post(
    "/auth/otp/request",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.otpRequestPerAccount, byEmailInBody) },
    async (request) => {
      const body = otpRequestSchema.parse(request.body);
      const studioId = await requireStudio(request);
      await studioAuth.requestOtpLogin(body.email, studioId, requestMeta(request));
      return { ok: true, data: null };
    },
  );

  app.post(
    "/auth/otp/verify",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.otpVerifyPerAccount, byEmailInBody) },
    async (request, reply) => {
      const body = otpVerifySchema.parse(request.body);
      const studioId = await requireStudio(request);
      const result = await studioAuth.verifyOtpLogin({ ...body, studioId, meta: requestMeta(request) });
      setRefreshCookie(reply, result.refreshToken, result.expiresAt);
      return { ok: true, data: { accessToken: result.accessToken } };
    },
  );

  // ── Two-factor authentication ───────────────────────────────────────
  app.post("/auth/2fa/setup", { preHandler: [app.authenticate] }, async (request) => {
    const auth = request.auth!;
    return { ok: true, data: await twoFactor.startTwoFactorSetup(auth.actorId, auth.studioId!) };
  });

  app.post("/auth/2fa/confirm", { preHandler: [app.authenticate] }, async (request) => {
    const { code } = twoFactorVerifySchema.parse(request.body);
    const auth = request.auth!;
    return { ok: true, data: await twoFactor.confirmTwoFactorSetup(auth.actorId, auth.studioId!, code) };
  });

  app.post("/auth/2fa/disable", { preHandler: [app.authenticate] }, async (request) => {
    const { password } = twoFactorDisableSchema.parse(request.body);
    const auth = request.auth!;
    await twoFactor.disableTwoFactor(auth.actorId, auth.studioId!, password);
    return { ok: true, data: null };
  });

  app.post("/auth/2fa/recovery-codes/regenerate", { preHandler: [app.authenticate] }, async (request) => {
    const auth = request.auth!;
    const codes = await twoFactor.regenerateRecoveryCodes(auth.actorId, auth.studioId!);
    return { ok: true, data: { recoveryCodes: codes } };
  });

  // ── Google OAuth ─────────────────────────────────────────────────────
  app.get("/auth/google", async (request, reply) => {
    const studioSlug = (request.query as { studioSlug?: string }).studioSlug;
    if (!studioSlug) {
      return reply.status(400).send({ ok: false, error: { code: "MISSING_STUDIO_SLUG", message: "studioSlug is required" } });
    }
    const { url } = googleAuth.startGoogleSignIn(studioSlug);
    return reply.redirect(url);
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code || !state) {
      return reply.status(400).send({ ok: false, error: { code: "INVALID_CALLBACK", message: "Missing code or state" } });
    }
    const studioSlug = state.split(".")[0]!;
    const studioId = await resolveStudioIdForAuth({ hostname: request.hostname, studioSlug });
    if (!studioId) {
      return reply.status(400).send({ ok: false, error: { code: "STUDIO_NOT_RESOLVED", message: "Unknown studio" } });
    }
    const result = await googleAuth.completeGoogleSignIn({ code, studioId, meta: requestMeta(request) });
    setRefreshCookie(reply, result.refreshToken, result.expiresAt);
    return { ok: true, data: { accessToken: result.accessToken } };
  });
}
