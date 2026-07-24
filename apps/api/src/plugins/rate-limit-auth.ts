import type { RateLimitRule } from "@bcp/auth";

/**
 * Converts a shared rate-limit rule into the `config.rateLimit` shape
 * `@fastify/rate-limit` reads per-route (the plugin is registered globally
 * in app.ts; per-route `config.rateLimit` overrides its defaults for that
 * route only). Keying by IP is the default; pass `keyGenerator` for the
 * per-account rules (e.g. login attempts keyed by the submitted email).
 */
export function toRouteRateLimit(
  rule: RateLimitRule,
  keyGenerator?: (request: { body?: unknown; ip: string }) => string,
) {
  return {
    rateLimit: {
      max: rule.max,
      timeWindow: rule.timeWindowSeconds * 1000,
      keyGenerator,
    },
  };
}

/** Keys a rate limit by the `email` field in the request body, falling back to IP if absent. */
export function byEmailInBody(request: { body?: unknown; ip: string }): string {
  const body = request.body as { email?: string } | undefined;
  return body?.email ? `email:${body.email.toLowerCase()}` : `ip:${request.ip}`;
}
