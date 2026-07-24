import { prisma } from "@bcp/database";
import { toMajorUnits, monthlyEquivalent } from "../../lib/currency";

export interface StudioCounts {
  total: number;
  active: number;
  trial: number;
  expired: number;
  suspended: number;
}

async function getStudioCounts(): Promise<StudioCounts> {
  const [total, active, trial, expired, suspended] = await Promise.all([
    prisma.studio.count({ where: { deletedAt: null } }),
    prisma.studio.count({ where: { status: "active", deletedAt: null } }),
    prisma.studio.count({ where: { status: "trial", deletedAt: null } }),
    prisma.studio.count({ where: { status: "expired", deletedAt: null } }),
    prisma.studio.count({ where: { status: "suspended", deletedAt: null } }),
  ]);
  return { total, active, trial, expired, suspended };
}

export interface RevenueMetrics {
  mrr: number; // major units
  arr: number;
  currency: string;
}

/**
 * MRR/ARR are computed live from active subscriptions × their plan price
 * (normalized to a monthly figure — yearly subscriptions divide by 12),
 * not from a separately-maintained running total. This is simpler to
 * reason about and can't drift from reality, at the cost of one join
 * query per computation rather than an O(1) read — acceptable at the
 * scale a dashboard metric needs (recomputed on each request, cached at
 * the HTTP layer if it ever becomes hot).
 */
async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: { in: ["active", "grace", "past_due"] } },
    select: { billingCycle: true, plan: { select: { priceMonthly: true, priceYearly: true, currency: true } } },
  });

  let mrrMinorUnits = 0;
  let currency = "INR";
  for (const sub of activeSubscriptions) {
    const amount = sub.billingCycle === "yearly" ? sub.plan.priceYearly : sub.plan.priceMonthly;
    mrrMinorUnits += monthlyEquivalent(amount, sub.billingCycle);
    currency = sub.plan.currency;
  }

  const mrr = toMajorUnits(mrrMinorUnits);
  return { mrr, arr: Math.round(mrr * 12 * 100) / 100, currency };
}

export interface RenewalChurnMetrics {
  /** Subscriptions ending within the next 30 days that haven't been cancelled. */
  upcomingRenewals: number;
  /** Subscriptions cancelled in the last 30 days. */
  cancelledLast30Days: number;
  /** cancelledLast30Days / (activeAtPeriodStart), as a percentage. */
  churnRatePercent: number;
}

async function getRenewalChurnMetrics(now = new Date()): Promise<RenewalChurnMetrics> {
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ago30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [upcomingRenewals, cancelledLast30Days, activeCount] = await Promise.all([
    prisma.subscription.count({
      where: { status: { in: ["active", "grace"] }, endsAt: { gte: now, lte: in30Days } },
    }),
    prisma.subscription.count({ where: { status: "cancelled", cancelledAt: { gte: ago30Days, lte: now } } }),
    prisma.subscription.count({ where: { status: { in: ["active", "grace", "past_due"] } } }),
  ]);

  const denominator = activeCount + cancelledLast30Days;
  const churnRatePercent = denominator === 0 ? 0 : Math.round((cancelledLast30Days / denominator) * 10000) / 100;

  return { upcomingRenewals, cancelledLast30Days, churnRatePercent };
}

export interface UsageMetrics {
  storageGb: number;
  aiRequests: number;
  whatsappMessages: number;
  emailsSent: number;
}

/** Sums the current calendar month's UsageRecord rows for each metered dimension, across every studio. */
async function getUsageMetrics(now = new Date()): Promise<UsageMetrics> {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [storage, ai, whatsapp, email] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: { metric: "storage_gb", periodStart: { gte: periodStart } },
      _sum: { value: true },
    }),
    prisma.usageRecord.aggregate({
      where: { metric: "ai_requests", periodStart: { gte: periodStart } },
      _sum: { value: true },
    }),
    prisma.usageRecord.aggregate({
      where: { metric: "whatsapp_messages", periodStart: { gte: periodStart } },
      _sum: { value: true },
    }),
    prisma.usageRecord.aggregate({
      where: { metric: "emails_sent", periodStart: { gte: periodStart } },
      _sum: { value: true },
    }),
  ]);

  return {
    storageGb: Number(storage._sum.value ?? 0),
    aiRequests: Number(ai._sum.value ?? 0),
    whatsappMessages: Number(whatsapp._sum.value ?? 0),
    emailsSent: Number(email._sum.value ?? 0),
  };
}

export interface PaymentSuccessMetrics {
  succeeded: number;
  failed: number;
  successRatePercent: number;
}

async function getPaymentSuccessMetrics(now = new Date()): Promise<PaymentSuccessMetrics> {
  const ago30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [succeeded, failed] = await Promise.all([
    prisma.payment.count({ where: { status: "succeeded", createdAt: { gte: ago30Days } } }),
    prisma.payment.count({ where: { status: "failed", createdAt: { gte: ago30Days } } }),
  ]);
  const total = succeeded + failed;
  return {
    succeeded,
    failed,
    successRatePercent: total === 0 ? 100 : Math.round((succeeded / total) * 10000) / 100,
  };
}

export interface JobHealthMetrics {
  failedJobsLast24h: number;
  queuedJobs: number;
}

async function getJobHealthMetrics(now = new Date()): Promise<JobHealthMetrics> {
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [failedJobsLast24h, queuedJobs] = await Promise.all([
    prisma.jobRecord.count({ where: { status: "failed", createdAt: { gte: ago24h } } }),
    prisma.jobRecord.count({ where: { status: { in: ["queued", "retrying"] } } }),
  ]);
  return { failedJobsLast24h, queuedJobs };
}

export type SystemHealthStatus = "healthy" | "degraded" | "unhealthy";

export interface SystemHealthMetrics {
  status: SystemHealthStatus;
  databaseOk: boolean;
  failedJobsLast24h: number;
}

/**
 * A deliberately simple health rollup: the database responds (we're
 * running this query at all, so implicitly yes — a real deployment would
 * add a Redis ping and a queue-depth check here too) and the failed-job
 * rate isn't spiking. `degraded` at 1-9 failures in 24h, `unhealthy` at
 * 10+ — thresholds chosen to be a starting point, not a tuned SLO; adjust
 * once there's real production job-failure baseline data.
 */
async function getSystemHealth(jobHealth: JobHealthMetrics): Promise<SystemHealthMetrics> {
  let databaseOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseOk = false;
  }

  let status: SystemHealthStatus = "healthy";
  if (!databaseOk) status = "unhealthy";
  else if (jobHealth.failedJobsLast24h >= 10) status = "unhealthy";
  else if (jobHealth.failedJobsLast24h >= 1) status = "degraded";

  return { status, databaseOk, failedJobsLast24h: jobHealth.failedJobsLast24h };
}

export interface DashboardMetrics {
  studios: StudioCounts;
  revenue: RevenueMetrics;
  renewalsChurn: RenewalChurnMetrics;
  usage: UsageMetrics;
  payments: PaymentSuccessMetrics;
  jobs: JobHealthMetrics;
  health: SystemHealthMetrics;
}

/** Assembles all 16 dashboard metrics in parallel where independent. */
export async function getDashboardMetrics(now = new Date()): Promise<DashboardMetrics> {
  const [studios, revenue, renewalsChurn, usage, payments, jobs] = await Promise.all([
    getStudioCounts(),
    getRevenueMetrics(),
    getRenewalChurnMetrics(now),
    getUsageMetrics(now),
    getPaymentSuccessMetrics(now),
    getJobHealthMetrics(now),
  ]);

  const health = await getSystemHealth(jobs);

  return { studios, revenue, renewalsChurn, usage, payments, jobs, health };
}
