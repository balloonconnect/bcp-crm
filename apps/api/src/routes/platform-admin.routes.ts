import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePlatformPermission } from "../plugins/auth-guard";
import * as metrics from "../services/platform/metrics.service";
import * as studios from "../services/platform/studios.service";
import * as billing from "../services/platform/billing.service";
import * as infra from "../services/platform/infrastructure.service";
import * as governance from "../services/platform/governance.service";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export async function platformAdminRoutes(app: FastifyInstance) {
  // ── Dashboard ────────────────────────────────────────────────────────
  app.get(
    "/platform/dashboard",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async () => ({ ok: true, data: await metrics.getDashboardMetrics() }),
  );

  // ── Studios module ───────────────────────────────────────────────────
  app.get(
    "/platform/studios",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async (request) => {
      const query = paginationSchema
        .extend({ status: z.string().optional(), search: z.string().optional() })
        .parse(request.query);
      return { ok: true, data: await studios.listStudios(query as never) };
    },
  );

  app.get(
    "/platform/studios/:studioId",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async (request) => {
      const { studioId } = z.object({ studioId: z.string().uuid() }).parse(request.params);
      return { ok: true, data: await studios.getStudioDetail(studioId) };
    },
  );

  app.post(
    "/platform/studios/:studioId/suspend",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:suspend")] },
    async (request) => {
      const { studioId } = z.object({ studioId: z.string().uuid() }).parse(request.params);
      const { reason } = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
      const updated = await studios.suspendStudio(studioId, request.auth!.actorId, reason);
      return { ok: true, data: updated };
    },
  );

  app.post(
    "/platform/studios/:studioId/reinstate",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:suspend")] },
    async (request) => {
      const { studioId } = z.object({ studioId: z.string().uuid() }).parse(request.params);
      const updated = await studios.reinstateStudio(studioId, request.auth!.actorId);
      return { ok: true, data: updated };
    },
  );

  // ── Users module ─────────────────────────────────────────────────────
  app.get(
    "/platform/users/platform",
    { preHandler: [app.authenticate, requirePlatformPermission("platform_user:manage")] },
    async () => ({ ok: true, data: await studios.listPlatformUsers() }),
  );

  app.get(
    "/platform/users/studio",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async (request) => {
      const query = paginationSchema
        .extend({ email: z.string().optional(), studioId: z.string().uuid().optional() })
        .parse(request.query);
      return { ok: true, data: await studios.searchStudioUsers(query as never) };
    },
  );

  // ── Plans module ─────────────────────────────────────────────────────
  app.get(
    "/platform/plans",
    { preHandler: [app.authenticate, requirePlatformPermission("plan:manage")] },
    async () => ({ ok: true, data: await billing.listPlans() }),
  );

  app.patch(
    "/platform/plans/:planId",
    { preHandler: [app.authenticate, requirePlatformPermission("plan:manage")] },
    async (request) => {
      const { planId } = z.object({ planId: z.string().uuid() }).parse(request.params);
      const updates = z
        .object({
          isActive: z.boolean().optional(),
          priceMonthly: z.number().int().optional(),
          priceYearly: z.number().int().optional(),
        })
        .parse(request.body);
      return { ok: true, data: await billing.updatePlan(planId, updates, request.auth!.actorId) };
    },
  );

  // ── Subscriptions module ─────────────────────────────────────────────
  app.get(
    "/platform/subscriptions",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async (request) => {
      const query = paginationSchema
        .extend({ studioId: z.string().uuid().optional(), status: z.string().optional() })
        .parse(request.query);
      return { ok: true, data: await billing.listSubscriptions(query as never) };
    },
  );

  // ── Licenses module ──────────────────────────────────────────────────
  app.get(
    "/platform/licenses",
    { preHandler: [app.authenticate, requirePlatformPermission("license:issue")] },
    async (request) => {
      const query = paginationSchema
        .extend({ studioId: z.string().uuid().optional(), status: z.string().optional() })
        .parse(request.query);
      return { ok: true, data: await billing.listLicenses(query as never) };
    },
  );

  app.post(
    "/platform/licenses",
    { preHandler: [app.authenticate, requirePlatformPermission("license:issue")] },
    async (request) => {
      const body = z
        .object({
          studioId: z.string().uuid(),
          subscriptionId: z.string().uuid().optional(),
          tier: z.string(),
          seatsAllowed: z.number().int().positive().optional(),
          maxActivations: z.number().int().positive().optional(),
          validForDays: z.number().int().positive().optional(),
        })
        .parse(request.body);
      const license = await billing.issueLicense({ ...body, actorId: request.auth!.actorId });
      return { ok: true, data: license };
    },
  );

  app.post(
    "/platform/licenses/:licenseId/revoke",
    { preHandler: [app.authenticate, requirePlatformPermission("license:revoke")] },
    async (request) => {
      const { licenseId } = z.object({ licenseId: z.string().uuid() }).parse(request.params);
      const { reason } = z.object({ reason: z.string() }).parse(request.body);
      const updated = await billing.revokeLicense(licenseId, request.auth!.actorId, reason);
      return { ok: true, data: updated };
    },
  );

  app.post(
    "/platform/licenses/:licenseId/suspend",
    { preHandler: [app.authenticate, requirePlatformPermission("license:revoke")] },
    async (request) => {
      const { licenseId } = z.object({ licenseId: z.string().uuid() }).parse(request.params);
      const { reason } = z.object({ reason: z.string() }).parse(request.body);
      const updated = await billing.suspendLicense(licenseId, request.auth!.actorId, reason);
      return { ok: true, data: updated };
    },
  );

  app.post(
    "/platform/licenses/:licenseId/reinstate",
    { preHandler: [app.authenticate, requirePlatformPermission("license:issue")] },
    async (request) => {
      const { licenseId } = z.object({ licenseId: z.string().uuid() }).parse(request.params);
      const updated = await billing.reinstateLicense(licenseId, request.auth!.actorId);
      return { ok: true, data: updated };
    },
  );

  app.post(
    "/platform/licenses/:licenseId/renew",
    { preHandler: [app.authenticate, requirePlatformPermission("license:issue")] },
    async (request) => {
      const { licenseId } = z.object({ licenseId: z.string().uuid() }).parse(request.params);
      const { validForDays } = z.object({ validForDays: z.number().int().positive().optional() }).parse(request.body ?? {});
      const renewed = await billing.renewLicense(licenseId, request.auth!.actorId, validForDays);
      return { ok: true, data: renewed };
    },
  );

  // ── Activations module ───────────────────────────────────────────────
  app.get(
    "/platform/licenses/:licenseId/activations",
    { preHandler: [app.authenticate, requirePlatformPermission("license:issue")] },
    async (request) => {
      const { licenseId } = z.object({ licenseId: z.string().uuid() }).parse(request.params);
      return { ok: true, data: await billing.listActivations(licenseId) };
    },
  );

  app.post(
    "/platform/activations/:activationId/deactivate",
    { preHandler: [app.authenticate, requirePlatformPermission("license:revoke")] },
    async (request) => {
      const { activationId } = z.object({ activationId: z.string().uuid() }).parse(request.params);
      return { ok: true, data: await billing.deactivateActivation(activationId, request.auth!.actorId) };
    },
  );

  // ── Payments module ──────────────────────────────────────────────────
  app.get(
    "/platform/payments",
    { preHandler: [app.authenticate, requirePlatformPermission("payment:view")] },
    async (request) => {
      const query = paginationSchema
        .extend({ studioId: z.string().uuid().optional(), status: z.string().optional() })
        .parse(request.query);
      return { ok: true, data: await billing.listPayments(query as never) };
    },
  );

  // ── Domains module ───────────────────────────────────────────────────
  app.get(
    "/platform/domains",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async (request) => {
      const query = paginationSchema.extend({ status: z.string().optional() }).parse(request.query);
      return { ok: true, data: await infra.listAllDomains(query as never) };
    },
  );

  // ── Storage module ───────────────────────────────────────────────────
  app.get(
    "/platform/storage",
    { preHandler: [app.authenticate, requirePlatformPermission("storage:view")] },
    async () => ({ ok: true, data: await infra.getStorageUsageBreakdown() }),
  );

  // ── AI providers module ──────────────────────────────────────────────
  app.get(
    "/platform/providers/ai",
    { preHandler: [app.authenticate, requirePlatformPermission("system_config:manage")] },
    async () => ({ ok: true, data: infra.listAiProviders() }),
  );

  // ── Messaging providers module ───────────────────────────────────────
  app.get(
    "/platform/providers/messaging",
    { preHandler: [app.authenticate, requirePlatformPermission("system_config:manage")] },
    async () => ({ ok: true, data: infra.listMessagingProviders() }),
  );

  // ── Feature flags module ─────────────────────────────────────────────
  app.get(
    "/platform/feature-flags",
    { preHandler: [app.authenticate, requirePlatformPermission("feature_flag:manage")] },
    async (request) => {
      const { studioId } = z.object({ studioId: z.string().uuid().optional() }).parse(request.query);
      return { ok: true, data: await governance.listFeatureFlags(studioId) };
    },
  );

  app.put(
    "/platform/feature-flags",
    { preHandler: [app.authenticate, requirePlatformPermission("feature_flag:manage")] },
    async (request) => {
      const body = z
        .object({ key: z.string(), enabled: z.boolean(), studioId: z.string().uuid().optional() })
        .parse(request.body);
      return { ok: true, data: await governance.setFeatureFlag({ ...body, actorId: request.auth!.actorId }) };
    },
  );

  // ── Announcements module ─────────────────────────────────────────────
  app.get(
    "/platform/announcements",
    { preHandler: [app.authenticate, requirePlatformPermission("announcement:manage")] },
    async () => ({ ok: true, data: await governance.listAnnouncements() }),
  );

  app.post(
    "/platform/announcements",
    { preHandler: [app.authenticate, requirePlatformPermission("announcement:manage")] },
    async (request) => {
      const body = z
        .object({
          title: z.string().min(1).max(200),
          body: z.string().min(1).max(5000),
          severity: z.enum(["info", "warning", "critical"]).default("info"),
          audience: z.record(z.unknown()).optional(),
        })
        .parse(request.body);
      return { ok: true, data: await governance.createAnnouncement({ ...body, actorId: request.auth!.actorId }) };
    },
  );

  app.post(
    "/platform/announcements/:announcementId/publish",
    { preHandler: [app.authenticate, requirePlatformPermission("announcement:manage")] },
    async (request) => {
      const { announcementId } = z.object({ announcementId: z.string().uuid() }).parse(request.params);
      return { ok: true, data: await governance.publishAnnouncement(announcementId, request.auth!.actorId) };
    },
  );

  // ── Support requests module ──────────────────────────────────────────
  app.get(
    "/platform/support-requests",
    { preHandler: [app.authenticate, requirePlatformPermission("support_request:manage")] },
    async (request) => {
      const query = paginationSchema
        .extend({ status: z.string().optional(), assignedTo: z.string().uuid().optional() })
        .parse(request.query);
      return { ok: true, data: await governance.listSupportRequests(query as never) };
    },
  );

  app.post(
    "/platform/support-requests/:requestId/assign",
    { preHandler: [app.authenticate, requirePlatformPermission("support_request:manage")] },
    async (request) => {
      const { requestId } = z.object({ requestId: z.string().uuid() }).parse(request.params);
      const { platformUserId } = z.object({ platformUserId: z.string().uuid() }).parse(request.body);
      return {
        ok: true,
        data: await governance.assignSupportRequest(requestId, platformUserId, request.auth!.actorId),
      };
    },
  );

  app.post(
    "/platform/support-requests/:requestId/resolve",
    { preHandler: [app.authenticate, requirePlatformPermission("support_request:manage")] },
    async (request) => {
      const { requestId } = z.object({ requestId: z.string().uuid() }).parse(request.params);
      return { ok: true, data: await governance.resolveSupportRequest(requestId, request.auth!.actorId) };
    },
  );

  // ── Audit logs module ────────────────────────────────────────────────
  app.get(
    "/platform/audit-logs",
    { preHandler: [app.authenticate, requirePlatformPermission("studio:view")] },
    async (request) => {
      const query = paginationSchema
        .extend({
          studioId: z.string().uuid().optional(),
          resourceType: z.string().optional(),
          actorType: z.enum(["platform_user", "studio_user", "api_key", "system"]).optional(),
        })
        .parse(request.query);
      return { ok: true, data: await governance.listPlatformAuditLog(query) };
    },
  );

  // ── System configuration module ──────────────────────────────────────
  app.get(
    "/platform/system-config",
    { preHandler: [app.authenticate, requirePlatformPermission("system_config:manage")] },
    async () => ({ ok: true, data: await governance.listSystemConfig() }),
  );

  app.put(
    "/platform/system-config",
    { preHandler: [app.authenticate, requirePlatformPermission("system_config:manage")] },
    async (request) => {
      const { key, value } = z.object({ key: z.string(), value: z.unknown() }).parse(request.body);
      return { ok: true, data: await governance.setSystemConfig(key, value, request.auth!.actorId) };
    },
  );

  // ── Job monitoring module ────────────────────────────────────────────
  app.get(
    "/platform/jobs",
    { preHandler: [app.authenticate, requirePlatformPermission("job:manage")] },
    async (request) => {
      const query = paginationSchema
        .extend({ status: z.string().optional(), queue: z.string().optional() })
        .parse(request.query);
      return { ok: true, data: await infra.listJobs(query as never) };
    },
  );

  app.post(
    "/platform/jobs/:jobId/retry",
    { preHandler: [app.authenticate, requirePlatformPermission("job:manage")] },
    async (request) => {
      const { jobId } = z.object({ jobId: z.string().uuid() }).parse(request.params);
      return { ok: true, data: await infra.retryJob(jobId) };
    },
  );

  // ── Health monitoring module ─────────────────────────────────────────
  app.get(
    "/platform/health",
    { preHandler: [app.authenticate, requirePlatformPermission("health:view")] },
    async () => {
      const dashboard = await metrics.getDashboardMetrics();
      return { ok: true, data: dashboard.health };
    },
  );
}
