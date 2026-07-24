import type { FastifyInstance, FastifyReply } from "fastify";
import { signInSchema, twoFactorChallengeSchema, refreshTokenSchema } from "@bcp/validation";
import { AUTH_RATE_LIMITS, generateCsrfToken, verifyCsrfToken } from "@bcp/auth";
import { flattenPlatformPermissions } from "@bcp/permissions";
import { prisma } from "@bcp/database";
import * as platformAuth from "../services/platform-auth.service";
import * as refreshService from "../services/refresh.service";
import { toRouteRateLimit, byEmailInBody } from "../plugins/rate-limit-auth";

const REFRESH_COOKIE = "bcp_platform_refresh_token";
const CSRF_COOKIE = "bcp_platform_csrf_token";

function requestMeta(request: { ip: string; headers: Record<string, unknown> }) {
  return {
    ipAddress: request.ip,
    userAgent: typeof request.headers["user-agent"] === "string" ? (request.headers["user-agent"] as string) : null,
  };
}

export async function platformAuthRoutes(app: FastifyInstance) {
  function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/platform-auth",
      expires: expiresAt,
    });
    reply.setCookie(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/platform-auth",
      expires: expiresAt,
    });
  }

  app.post(
    "/platform-auth/login",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.loginPerAccount, byEmailInBody) },
    async (request, reply) => {
      const body = signInSchema.pick({ email: true, password: true }).parse(request.body);

      try {
        const result = await platformAuth.platformLogin({ ...body, meta: requestMeta(request) });
        setRefreshCookie(reply, result.refreshToken, result.expiresAt);
        return { ok: true, data: { accessToken: result.accessToken } };
      } catch (err) {
        if (err instanceof platformAuth.TwoFactorRequiredError) {
          return reply.send({ ok: true, data: { requiresTwoFactor: true, challengeToken: err.challengeToken } });
        }
        throw err;
      }
    },
  );

  app.post(
    "/platform-auth/2fa/challenge",
    { config: toRouteRateLimit(AUTH_RATE_LIMITS.twoFactorVerifyPerAccount) },
    async (request, reply) => {
      const body = twoFactorChallengeSchema.parse(request.body);
      const result = await platformAuth.completePlatformTwoFactorLogin({ ...body, meta: requestMeta(request) });
      setRefreshCookie(reply, result.refreshToken, result.expiresAt);
      return { ok: true, data: { accessToken: result.accessToken } };
    },
  );

  app.post("/platform-auth/refresh", async (request, reply) => {
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const bodyToken = refreshTokenSchema.safeParse(request.body).data?.refreshToken;
    const presented = cookieToken ?? bodyToken;
    if (!presented) {
      return reply.status(401).send({ ok: false, error: { code: "NO_REFRESH_TOKEN", message: "No refresh token presented" } });
    }
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

  app.get("/platform-auth/me", { preHandler: [app.authenticate] }, async (request) => {
    const auth = request.auth!;
    const user = await prisma.platformUser.findFirst({
      where: { id: auth.actorId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        roles: { select: { platformRole: { select: { key: true, name: true, permissions: true } } } },
      },
    });
    if (!user) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Platform user not found" } };
    }
    const roles = user.roles.map((r: { platformRole: { key: string; name: string; permissions: string[] } }) => r.platformRole);
    return {
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        roles: roles.map((r: { key: string; name: string }) => ({ key: r.key, name: r.name })),
        permissions: flattenPlatformPermissions(roles),
      },
    };
  });

  app.post("/platform-auth/logout", { preHandler: [app.authenticate] }, async (request, reply) => {
    await refreshService.logout(request.auth!.sessionId);
    reply.clearCookie(REFRESH_COOKIE, { path: "/platform-auth" });
    reply.clearCookie(CSRF_COOKIE, { path: "/platform-auth" });
    return { ok: true, data: null };
  });
}
