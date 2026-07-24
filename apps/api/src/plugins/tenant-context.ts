import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken, resolveTenantContext, type ActorType } from "@bcp/auth";
import { prisma } from "@bcp/database";
import { getEnv } from "@bcp/config";
import fp from "fastify-plugin";

export interface RequestAuth {
  actorId: string;
  actorType: ActorType;
  sessionId: string;
  /** Resolved, verified studio id — the ONLY studioId route handlers should ever use. */
  studioId: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: RequestAuth;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Looks up an active custom domain's studio. Only rows with
 * `status = "active"` count — matches the same bar the hostname
 * middleware applies (see hostname-middleware.ts) so an unverified or
 * not-yet-activated domain claim never resolves tenancy here either.
 */
async function resolveStudioIdForHostname(hostname: string): Promise<string | null> {
  const domain = await prisma.studioDomain.findFirst({
    where: { domain: hostname, status: "active", deletedAt: null },
    select: { studioId: true },
  });
  return domain?.studioId ?? null;
}

/** Active, non-deleted membership check — the "authenticated membership" leg of tenant resolution. */
async function hasActiveMembership(actorId: string, studioId: string): Promise<boolean> {
  const user = await prisma.studioUser.findFirst({
    where: { id: actorId, studioId, status: "active", deletedAt: null },
    select: { id: true },
  });
  return user !== null;
}

/**
 * Decorates `request.auth` from the Authorization header's access token —
 * never from a body/query/header `studioId` value. Register once; use the
 * `authenticate` preHandler on any route that needs a signed-in actor.
 */
export const tenantContextPlugin = fp(async function tenantContextPlugin(app: FastifyInstance) {
  const env = getEnv();

  app.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      const header = request.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHENTICATED", message: "Missing bearer token" } });
      }

      let claims;
      try {
        claims = await verifyAccessToken(header.slice("Bearer ".length), env.AUTH_SECRET);
      } catch {
        return reply.status(401).send({ ok: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired access token" } });
      }

      const session = await prisma.session.findUnique({ where: { id: claims.sessionId } });
      if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
        return reply.status(401).send({ ok: false, error: { code: "SESSION_REVOKED", message: "Session is no longer valid" } });
      }

      if (claims.studioId === null) {
        request.auth = {
          actorId: claims.sub,
          actorType: claims.actorType,
          sessionId: claims.sessionId,
          studioId: null,
        };
        return;
      }

      const result = await resolveTenantContext({
        actorId: claims.sub,
        sessionStudioId: claims.studioId,
        hostname: request.hostname,
        resolveStudioIdForHostname,
        hasActiveMembership,
      });

      if (!result.ok) {
        return reply
          .status(403)
          .send({ ok: false, error: { code: "TENANT_RESOLUTION_FAILED", message: result.reason } });
      }

      request.auth = {
        actorId: claims.sub,
        actorType: claims.actorType,
        sessionId: claims.sessionId,
        studioId: result.studioId,
      };
    },
  );
});
