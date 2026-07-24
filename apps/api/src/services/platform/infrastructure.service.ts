import { prisma } from "@bcp/database";
import { getEnv } from "@bcp/config";
import { jobQueues } from "../../lib/job-queues";

// ── Domains module (platform-wide view across every studio) ────────────

export async function listAllDomains(input: { status?: string; page?: number; pageSize?: number } = {}) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 25, 100);
  const where = {
    deletedAt: null,
    ...(input.status ? { status: input.status as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.studioDomain.findMany({
      where,
      include: { studio: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.studioDomain.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

// ── Storage module ───────────────────────────────────────────────────────

export interface StudioStorageUsage {
  studioId: string;
  studioName: string;
  storageGb: number;
}

/** Top studios by current-month storage usage, plus the platform total. */
export async function getStorageUsageBreakdown(now = new Date(), limit = 20) {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const records = await prisma.usageRecord.findMany({
    where: { metric: "storage_gb", periodStart: { gte: periodStart } },
    include: { studio: { select: { name: true } } },
  });

  const byStudio = new Map<string, StudioStorageUsage>();
  for (const record of records) {
    const existing = byStudio.get(record.studioId);
    const value = Number(record.value);
    if (existing) {
      existing.storageGb += value;
    } else {
      byStudio.set(record.studioId, { studioId: record.studioId, studioName: record.studio.name, storageGb: value });
    }
  }

  const breakdown = Array.from(byStudio.values()).sort((a, b) => b.storageGb - a.storageGb);
  const total = breakdown.reduce((sum, s) => sum + s.storageGb, 0);

  return { total, topStudios: breakdown.slice(0, limit) };
}

// ── AI / Messaging providers modules ────────────────────────────────────
// Provider *configuration* (API keys, secrets) lives in environment
// variables (see @bcp/config), never in the database — this module only
// reports whether each known provider is configured, not the secret
// itself, so platform-admin can show connection status without ever
// handling credentials.

export interface ProviderStatus {
  key: string;
  name: string;
  category: "ai" | "messaging_whatsapp" | "messaging_email";
  configured: boolean;
}

export function listAiProviders(): ProviderStatus[] {
  const env = getEnv();
  return [
    { key: "anthropic", name: "Anthropic Claude", category: "ai", configured: Boolean(env.ANTHROPIC_API_KEY) },
  ];
}

export function listMessagingProviders(): ProviderStatus[] {
  const env = getEnv();
  return [
    {
      key: "whatsapp_cloud_api",
      name: "WhatsApp Business Cloud API",
      category: "messaging_whatsapp",
      configured: Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID),
    },
    {
      key: "smtp",
      name: "Email (SMTP)",
      category: "messaging_email",
      configured: Boolean(env.SMTP_HOST),
    },
  ];
}

// ── Job monitoring module ───────────────────────────────────────────────

export async function listJobs(input: { status?: string; queue?: string; page?: number; pageSize?: number } = {}) {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 50, 200);
  const where = {
    ...(input.status ? { status: input.status as never } : {}),
    ...(input.queue ? { queue: input.queue } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.jobRecord.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.jobRecord.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

export class JobNotFoundError extends Error {
  readonly code = "JOB_NOT_FOUND";
  constructor() {
    super("Job record not found");
    this.name = "JobNotFoundError";
  }
}

export class JobNotRetryableError extends Error {
  readonly code = "JOB_NOT_RETRYABLE";
  constructor() {
    super("Only failed jobs can be retried");
    this.name = "JobNotRetryableError";
  }
}

/** Re-queues a failed job. Actually re-processing it is the worker's job — this just flips the record back to `queued` for the worker to pick up. */
export async function retryJob(jobId: string) {
  const job = await prisma.jobRecord.findUnique({ where: { id: jobId } });
  if (!job) throw new JobNotFoundError();
  if (job.status !== "failed" && job.status !== "dead_letter") throw new JobNotRetryableError();

  const updated = await prisma.jobRecord.update({
    where: { id: jobId },
    data: { status: "queued", error: null, startedAt: null, finishedAt: null, attempts: 0 },
  });

  // Genuinely re-enqueues the job for real work, not just a DB status flip — the payload
  // was persisted on JobRecord.payload at original enqueue time (see jobs.service.ts's
  // enqueueJob()), so it's replayed exactly, not reconstructed.
  const bullQueue = jobQueues[job.queue];
  if (bullQueue) await bullQueue.add(job.jobName, { ...(job.payload as Record<string, unknown>), jobRecordId: job.id, studioId: job.studioId }, { jobId: job.id });

  return updated;
}
