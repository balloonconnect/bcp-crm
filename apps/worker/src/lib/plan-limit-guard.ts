import { prisma } from "@bcp/database";
import { planLimitsSchema, evaluateUsageWarning, DIMENSION_USAGE_METRIC, type PlanLimitDimension } from "@bcp/billing";
import { PlanLimitExceededError } from "@bcp/permissions";

/**
 * Worker-side counterpart to apps/api's plan-limit-enforcement.ts —
 * duplicated rather than imported cross-app (apps/api and apps/worker are
 * separate deployables; sharing *application* code between them would mean
 * a new shared package for two call sites, which isn't worth it yet). The
 * pure decision logic (@bcp/billing, @bcp/permissions) is shared; only the
 * thin Prisma-querying wrapper around it is duplicated.
 */
async function resolvePlanLimits(studioId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { studioId, status: { in: ["trialing", "active", "grace", "past_due"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (!subscription) return null;
  return planLimitsSchema.parse(subscription.plan.limits);
}

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

/**
 * Called at the top of a job processor for any job type metered against a
 * monthly plan-limit dimension (AI face searches, AI analysis jobs,
 * automation runs, …). Throws `PlanLimitExceededError` if the studio has
 * hit its plan's limit — the job processor should catch this, mark the
 * job failed with a clear reason, and *not* retry, since retrying a
 * limit-exceeded job will only fail again until the next billing period.
 */
export async function assertJobWithinPlanLimit(studioId: string, dimension: PlanLimitDimension, now = new Date()): Promise<void> {
  const limits = await resolvePlanLimits(studioId);
  const limitValue = limits ? limits[dimension] : null;
  if (typeof limitValue === "boolean") return; // feature-gate dimensions aren't job-metered

  const current = await getMonthlyUsage(studioId, dimension, now);
  const warning = evaluateUsageWarning(current + 1, limitValue as number | null);
  if (!warning.check.allowed) {
    throw new PlanLimitExceededError(dimension, warning.check);
  }
}

/** Records the job's usage once it completes successfully. */
export async function recordJobUsage(studioId: string, dimension: PlanLimitDimension, now = new Date()): Promise<void> {
  const metric = DIMENSION_USAGE_METRIC[dimension];
  if (!metric) return;
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  await prisma.usageRecord.create({
    data: { studioId, metric, value: 1, periodStart, periodEnd, recordedAt: now },
  });
}
