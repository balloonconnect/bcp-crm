import { prisma } from "@bcp/database";
import { canCancelJob, getQueueDefinition } from "@bcp/queue";
import { jobQueues } from "../lib/job-queues";

export class JobNotFoundError extends Error {
  readonly code = "JOB_NOT_FOUND";
  constructor() {
    super("Job not found");
    this.name = "JobNotFoundError";
  }
}

export class JobNotCancellableError extends Error {
  readonly code = "JOB_NOT_CANCELLABLE";
  constructor(status: string) {
    super(`A job in status "${status}" can't be cancelled — it's already reached a final outcome.`);
    this.name = "JobNotCancellableError";
  }
}

/**
 * "Idempotency" — the enqueue-time half of the pair (the other half,
 * `@bcp/queue`'s `buildIdempotencyKey()`, just builds the key). If a
 * `JobRecord` with the same key already exists and hasn't reached a
 * terminal failure, this returns the *existing* record instead of
 * creating a duplicate — enqueueing the same logical job twice (a
 * retried API call, a double-submitted form) never results in the
 * work actually happening twice.
 */
export async function enqueueJob(studioId: string | null, queue: string, jobName: string, payload: Record<string, unknown>, idempotencyKey?: string) {
  const definition = getQueueDefinition(queue);
  if (!definition) throw new Error(`Unknown queue: ${queue}`);

  if (idempotencyKey) {
    const existing = await prisma.jobRecord.findFirst({ where: { studioId: studioId ?? undefined, queue, jobName, status: { notIn: ["failed", "cancelled"] }, payload: { path: ["idempotencyKey"], equals: idempotencyKey } } });
    if (existing) return existing;
  }

  const record = await prisma.jobRecord.create({
    data: { studioId: studioId ?? undefined, queue, jobName, status: "queued", maxAttempts: definition.maxAttempts, payload: { ...payload, idempotencyKey: idempotencyKey ?? null } },
  });

  const bullQueue = jobQueues[queue];
  await bullQueue!.add(jobName, { ...payload, jobRecordId: record.id, studioId }, { jobId: record.id });

  return record;
}

// ── Studio-visible status ───────────────────────────────────────────

export async function listJobsForStudio(studioId: string, filter?: { queue?: string; status?: string }) {
  return prisma.jobRecord.findMany({ where: { studioId, ...(filter?.queue ? { queue: filter.queue } : {}), ...(filter?.status ? { status: filter.status as never } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function getJobForStudio(studioId: string, jobId: string) {
  const job = await prisma.jobRecord.findFirst({ where: { id: jobId, studioId } });
  if (!job) throw new JobNotFoundError();
  return job;
}

// ── Admin monitoring ─────────────────────────────────────────────────
// Platform-wide job listing already exists in platform/infrastructure.service.ts's
// listJobs() (paginated, wired into platform-admin.routes.ts) — not duplicated here.

export async function getQueueHealthSummary() {
  const grouped = await prisma.jobRecord.groupBy({ by: ["queue", "status"], _count: { _all: true } });
  return grouped.map((g: { queue: string; status: string; _count: { _all: number } }) => ({ queue: g.queue, status: g.status, count: g._count._all }));
}

// ── Cancellation ─────────────────────────────────────────────────────

export async function cancelJob(studioId: string | null, jobId: string, actorId: string) {
  const job = await prisma.jobRecord.findFirst({ where: studioId ? { id: jobId, studioId } : { id: jobId } });
  if (!job) throw new JobNotFoundError();
  if (!canCancelJob(job.status as never)) throw new JobNotCancellableError(job.status);

  const bullQueue = jobQueues[job.queue];
  const bullJob = await bullQueue?.getJob(jobId);
  await bullJob?.remove().catch(() => undefined); // best-effort — the JobRecord status change below is the authoritative outcome regardless

  const updated = await prisma.jobRecord.update({ where: { id: jobId }, data: { status: "cancelled", finishedAt: new Date() } });
  await prisma.auditLog.create({ data: { studioId: studioId ?? undefined, actorType: studioId ? "studio_user" : "platform_user", actorId, action: "job.cancelled", resourceType: "JobRecord", resourceId: jobId, metadata: { queue: job.queue } } });
  return updated;
}
