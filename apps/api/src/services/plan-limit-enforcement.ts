import { prisma } from "@bcp/database";
import {
  planLimitsSchema,
  evaluateUsageWarning,
  crossedNewThreshold,
  DIMENSION_USAGE_METRIC,
  MONTHLY_RESETTING_DIMENSIONS,
  type PlanLimits,
  type PlanLimitDimension,
} from "@bcp/billing";
import { PlanLimitExceededError } from "@bcp/permissions";

/** Resolves the effective PlanLimits for a studio from its current subscription's plan. Falls back to an all-null (unlimited) object if the studio somehow has no active subscription — enforcement fails open rather than locking out a studio over a billing data gap. */
export async function resolveStudioPlanLimits(studioId: string): Promise<PlanLimits> {
  const subscription = await prisma.subscription.findFirst({
    where: { studioId, status: { in: ["trialing", "active", "grace", "past_due"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!subscription) {
    return planLimitsSchema.parse({
      maxUsers: null,
      maxBranches: null,
      maxStorageGb: null,
      maxLeads: null,
      maxClients: null,
      maxEvents: null,
      maxGalleries: null,
      maxMonthlyUploads: null,
      maxAiFaceSearchesPerMonth: null,
      maxAiAnalysisJobsPerMonth: null,
      maxWhatsappMessagesPerMonth: null,
      maxEmailMessagesPerMonth: null,
      maxAutomationRunsPerMonth: null,
      maxCustomDomains: null,
      whiteLabelAccess: true,
      apiAccess: true,
    });
  }

  return planLimitsSchema.parse(subscription.plan.limits);
}

/** Current usage for a *standing-count* dimension (users, branches, custom domains, …) — a live count, not a monthly quota. */
async function getStandingCount(studioId: string, dimension: PlanLimitDimension): Promise<number> {
  switch (dimension) {
    case "maxUsers":
      return prisma.studioUser.count({ where: { studioId, deletedAt: null } });
    case "maxBranches":
      return prisma.studioBranch.count({ where: { studioId, deletedAt: null } });
    case "maxCustomDomains":
      return prisma.studioDomain.count({ where: { studioId, deletedAt: null } });
    case "maxClients":
      return prisma.client.count({ where: { studioId, deletedAt: null } });
    case "maxLeads":
      return prisma.lead.count({ where: { studioId, deletedAt: null } });
    case "maxEvents":
      return prisma.event.count({ where: { studioId, deletedAt: null } });
    case "maxGalleries":
      return prisma.gallery.count({ where: { studioId } });
    default:
      return 0;
  }
}

/** Current usage for a *monthly-resetting* quota dimension — summed from this month's UsageRecord rows. */
async function getMonthlyUsage(studioId: string, dimension: PlanLimitDimension, now: Date): Promise<number> {
  const metric = DIMENSION_USAGE_METRIC[dimension];
  if (!metric) return 0;

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await prisma.usageRecord.aggregate({
    where: { studioId, metric, periodStart: { gte: periodStart } },
    _sum: { value: true },
  });
  return Number(result._sum.value ?? 0);
}

export async function getCurrentUsage(
  studioId: string,
  dimension: PlanLimitDimension,
  now = new Date(),
): Promise<number> {
  if (MONTHLY_RESETTING_DIMENSIONS.includes(dimension)) {
    return getMonthlyUsage(studioId, dimension, now);
  }
  return getStandingCount(studioId, dimension);
}

/**
 * Records one unit of usage against a monthly-resetting dimension (e.g. an
 * AI analysis job just ran) — a thin wrapper over UsageRecord that keeps
 * the metric-name mapping in one place (DIMENSION_USAGE_METRIC).
 */
export async function recordUsage(
  studioId: string,
  dimension: PlanLimitDimension,
  amount = 1,
  now = new Date(),
): Promise<void> {
  const metric = DIMENSION_USAGE_METRIC[dimension];
  if (!metric) return;

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  await prisma.usageRecord.create({
    data: { studioId, metric, value: amount, periodStart, periodEnd, recordedAt: now },
  });
}

/**
 * Notifies the studio (in-app, via the Notification model) the first time
 * a threshold is crossed for a dimension in the current period —
 * `crossedNewThreshold` only returns non-null exactly once per threshold
 * per call site, so this is safe to call on every usage-recording
 * operation without spamming duplicate notifications for every unit past
 * the line.
 */
async function notifyIfThresholdCrossed(
  studioId: string,
  dimension: PlanLimitDimension,
  previousCount: number,
  newCount: number,
  limit: number | null,
): Promise<void> {
  const threshold = crossedNewThreshold(previousCount, newCount, limit);
  if (!threshold) return;

  const owners = await prisma.studioUser.findMany({
    where: {
      studioId,
      status: "active",
      deletedAt: null,
      roles: { some: { studioRole: { key: { in: ["owner", "admin"] } } } },
    },
    select: { id: true },
  });

  const title = threshold >= 100 ? "Plan limit reached" : "Approaching your plan limit";
  const body =
    threshold >= 100
      ? `You've reached your plan's limit for ${dimension}.`
      : `You've used ${threshold}% of your plan's ${dimension} limit.`;

  await Promise.all(
    owners.map((owner: { id: string }) =>
      prisma.notification.create({
        data: {
          studioId,
          recipientUserId: owner.id,
          channel: "in_app",
          title,
          body,
          metadata: { dimension, threshold },
        },
      }),
    ),
  );
}

/**
 * The main enforcement entry point — call before any action that should
 * be gated by a plan limit (creating a user, adding a domain, running an
 * AI job, …). Throws `PlanLimitExceededError` (@bcp/permissions, already
 * mapped to HTTP 402 by the error handler) when the limit is exceeded;
 * otherwise returns the usage-warning info and fires an in-app
 * notification exactly once per threshold crossed. `increment` lets a
 * caller check "would creating N more of this exceed the limit" without
 * two round trips.
 */
export async function assertWithinPlanLimit(
  studioId: string,
  dimension: PlanLimitDimension,
  increment = 1,
): Promise<{ percentUsed: number; level: "ok" | 70 | 85 | 95 | 100 }> {
  const limits = await resolveStudioPlanLimits(studioId);
  const limitValue = limits[dimension];

  if (typeof limitValue === "boolean") {
    if (!limitValue) {
      throw new PlanLimitExceededError(dimension, { allowed: false, limit: 0, current: 1, remaining: 0 });
    }
    return { percentUsed: 0, level: "ok" };
  }

  const currentUsage = await getCurrentUsage(studioId, dimension);
  const projected = currentUsage + increment;
  const warning = evaluateUsageWarning(projected, limitValue);

  if (!warning.check.allowed) {
    throw new PlanLimitExceededError(dimension, warning.check);
  }

  await notifyIfThresholdCrossed(studioId, dimension, currentUsage, projected, limitValue);

  return { percentUsed: warning.percentUsed, level: warning.level };
}

/** Read-only check (no throw) — used to render a usage dashboard. */
export async function getUsageSnapshot(studioId: string, dimension: PlanLimitDimension, now = new Date()) {
  const limits = await resolveStudioPlanLimits(studioId);
  const limitValue = limits[dimension];

  if (typeof limitValue === "boolean") {
    return { dimension, enabled: limitValue, current: null, limit: null, percentUsed: 0, level: "ok" as const };
  }

  const current = await getCurrentUsage(studioId, dimension, now);
  const warning = evaluateUsageWarning(current, limitValue);
  return {
    dimension,
    enabled: null,
    current,
    limit: limitValue,
    percentUsed: warning.percentUsed,
    level: warning.level,
  };
}
