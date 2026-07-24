import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * "Studio IDs" / "User IDs" on every structured log line — "Request
 * IDs" themselves are handled by Fastify's own built-in `genReqId`/
 * `requestIdHeader` options (configured on the `Fastify(...)`
 * constructor in app.ts) plus its native per-request `request.log`
 * child logger, rather than a second, competing ID/logger mechanism
 * layered on top. This plugin's only job is enriching that
 * already-existing `request.log` with `studioId`/`userId` once
 * auth has run, so every log line from that point in the request
 * onward carries full correlation without every route handler having
 * to remember to add it itself. `@bcp/logger`'s own `redact` config
 * (the "Never log" list) still applies — this plugin adds identity,
 * it never bypasses redaction.
 */
export const requestLoggingPlugin = fp(async function requestLoggingPlugin(app: FastifyInstance) {
  app.addHook("preHandler", async (request: FastifyRequest) => {
    if (request.auth) {
      request.log = request.log.child({ studioId: request.auth.studioId ?? undefined, userId: request.auth.actorId });
    }
  });
});
