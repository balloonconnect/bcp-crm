import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { prisma } from "@bcp/database";
import { validateHostHeader, checkStudioSuspension, checkSubscriptionRestriction } from "@bcp/domains";
import type { DomainPurpose } from "@bcp/domains";
import { getEnv } from "@bcp/config";
import { getResolvedTheme } from "../services/branding.service";
import { isPlatformHostname } from "../lib/is-platform-hostname";
import type { BrandTheme } from "@bcp/branding";

export interface HostnameContext {
  studioId: string;
  domain: string;
  purpose: DomainPurpose;
  /** true when the studio is in a billing grace period — caller should show a billing-issue banner but still serve the request. */
  degraded: boolean;
  theme: BrandTheme;
}

declare module "fastify" {
  interface FastifyRequest {
    /** The Host header after validation/normalization — always set once this plugin's hook has run, even for platform-hostname requests. */
    validatedHostname?: string;
    /** Set only when the request arrived on a studio's own custom domain (not the shared platform hostname). */
    hostnameContext?: HostnameContext;
  }
}

async function resolveCustomDomainFeatureEnabled(studioId: string): Promise<boolean> {
  const [override, globalDefault] = await Promise.all([
    prisma.featureFlag.findFirst({ where: { studioId, key: "custom_domain" } }),
    prisma.featureFlag.findFirst({ where: { studioId: null, key: "custom_domain" } }),
  ]);
  if (override) return override.enabled;
  if (globalDefault) return globalDefault.enabled;

  // Fall back to the studio's plan default (features JSON) when no explicit flag row exists.
  const subscription = await prisma.subscription.findFirst({
    where: { studioId, status: { in: ["trialing", "active", "grace", "past_due"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  const planFeatures = (subscription?.plan.features ?? {}) as Record<string, unknown>;
  return Boolean(planFeatures.custom_domain);
}

/**
 * Registered as an `onRequest` hook — runs before authentication, before
 * routing, before anything else touches the request. This is the "front
 * door" for every custom domain a studio has activated (gallery, client
 * portal, public enquiry form, white-label root website, and optionally
 * the CRM itself). See docs/custom-domains.md § "Secure hostname
 * middleware" for the full rationale behind each step below.
 */
export const hostnameMiddlewarePlugin = fp(async function hostnameMiddlewarePlugin(app: FastifyInstance) {
  const env = getEnv();
  const platformHostnames = env.PLATFORM_HOSTNAMES.split(",").map((s) => s.trim()).filter(Boolean);

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Validate the host — rejects malformed/multiple/injected Host headers outright.
    const validation = validateHostHeader(request.headers.host);
    if (!validation.ok) {
      return reply.status(400).send({
        ok: false,
        error: { code: "INVALID_HOST", message: `Invalid Host header: ${validation.reason}` },
      });
    }
    request.validatedHostname = validation.hostname;

    // 2. The platform's own hostnames (app.bcpstudio.os, localhost in dev)
    // never go through custom-domain resolution — normal routing applies.
    if (isPlatformHostname(validation.hostname, platformHostnames)) {
      return;
    }

    // 3. Resolve the studio that owns this domain — only `active` domains
    // resolve; `pending`/`verifying`/`failed` domains 404 rather than
    // leaking that a domain is *registered* to some studio before its
    // owner has actually gone live with it.
    const domainRecord = await prisma.studioDomain.findFirst({
      where: { domain: validation.hostname, status: "active", deletedAt: null },
      include: { studio: true },
    });

    if (!domainRecord) {
      return reply.status(404).send({
        ok: false,
        error: { code: "DOMAIN_NOT_FOUND", message: "No active studio is configured for this domain" },
      });
    }

    // 4. Reject suspended/cancelled studios outright — before auth, before
    // branding, before anything. A suspended studio's custom domain simply
    // stops resolving.
    const suspension = checkStudioSuspension(domainRecord.studio.status);
    if (!suspension.allowed) {
      return reply.status(403).send({
        ok: false,
        error: { code: "STUDIO_UNAVAILABLE", message: `This studio is ${suspension.reason}` },
      });
    }

    // 5. Apply subscription restrictions — a studio whose plan no longer
    // includes custom domains, or whose subscription has hard-expired, is
    // blocked; a studio in its billing grace period is let through but
    // flagged `degraded`.
    const customDomainEnabled = await resolveCustomDomainFeatureEnabled(domainRecord.studioId);
    const subscriptionCheck = checkSubscriptionRestriction({
      studioStatus: domainRecord.studio.status,
      customDomainFeatureEnabled: customDomainEnabled,
    });
    if (!subscriptionCheck.allowed) {
      return reply.status(402).send({
        ok: false,
        error: { code: "SUBSCRIPTION_RESTRICTED", message: `Custom domain unavailable: ${subscriptionCheck.reason}` },
      });
    }

    // 6. Resolve and apply branding (cached — see @bcp/branding/cache.ts).
    const resolvedTheme = await getResolvedTheme(domainRecord.studioId);

    // 7. Attach the tenant context this request will use downstream —
    // route handlers for public surfaces (gallery, portal, enquiry form)
    // read `request.hostnameContext` directly; authenticated CRM routes
    // still go through tenant-context.ts's independent session-based
    // resolution as well (defense in depth — see
    // packages/database/docs/tenant-isolation.md).
    request.hostnameContext = {
      studioId: domainRecord.studioId,
      domain: domainRecord.domain,
      purpose: domainRecord.purpose,
      degraded: "degraded" in subscriptionCheck ? subscriptionCheck.degraded : false,
      theme: resolvedTheme.theme,
    };
  });
});
