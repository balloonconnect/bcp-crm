import type { Job } from "bullmq";
import { prisma } from "@bcp/database";
import { logger } from "@bcp/logger";
import { shouldMoveToDeadLetter, getQueueDefinition } from "@bcp/queue";
import { sendFailureAlert } from "./failure-alerts";

const log = logger.child({ service: "worker" });

export interface JobContext {
  jobRecordId: string;
  studioId: string | null;
}

/**
 * The shared wrapper every one of the 14 queue processors runs
 * through — this is what turns BullMQ's own job lifecycle into the
 * brief's actual feature list: every job gets a `JobRecord` row
 * ("Logs"/"Studio-visible status"/"Admin monitoring" all read from
 * this one table), progress updates are mirrored onto both the
 * BullMQ job and the row, a failure past the queue's own configured
 * `maxAttempts` is marked `dead_letter` rather than left ambiguously
 * `failed` ("Dead-letter queue"), and a dead-letter transition
 * triggers a best-effort alert ("Failure alerts") that never blocks
 * the job's own outcome from being recorded. "Idempotency" is the one
 * piece this wrapper does *not* handle — that's checked by the
 * enqueue helper on the producing side (`apps/api`), before a
 * duplicate `JobRecord` is even created; see `@bcp/queue`'s
 * `buildIdempotencyKey()`.
 */
export async function withJobTracking<TData extends { jobRecordId: string; studioId?: string | null }>(
  queueKey: string,
  job: Job<TData>,
  handler: (job: Job<TData>, ctx: JobContext) => Promise<Record<string, unknown> | void>,
): Promise<void> {
  const { jobRecordId } = job.data;
  const studioId = job.data.studioId ?? null;
  const definition = getQueueDefinition(queueKey);

  const record = await prisma.jobRecord.update({
    where: { id: jobRecordId },
    data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const result = await handler(job, { jobRecordId, studioId });
    await prisma.jobRecord.update({ where: { id: jobRecordId }, data: { status: "completed", finishedAt: new Date(), result: (result ?? null) as never } });
    log.info({ jobId: job.id, queue: queueKey, jobRecordId }, "job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const attempts = record.attempts;
    const maxAttempts = definition?.maxAttempts ?? record.maxAttempts;
    const isDeadLetter = shouldMoveToDeadLetter(attempts, maxAttempts);

    await prisma.jobRecord.update({
      where: { id: jobRecordId },
      data: { status: isDeadLetter ? "dead_letter" : "retrying", finishedAt: isDeadLetter ? new Date() : null, error: message },
    });

    log.error({ jobId: job.id, queue: queueKey, jobRecordId, attempts, maxAttempts, err }, isDeadLetter ? "job moved to dead-letter queue" : "job failed, will retry");

    if (isDeadLetter) {
      await sendFailureAlert(queueKey, studioId, jobRecordId, message).catch(() => undefined);
    }

    throw err; // rethrow so BullMQ's own retry/backoff (configured per-queue) still drives the actual re-attempt scheduling
  }
}

/** "Progress" — mirrors onto both the live BullMQ job (for anyone polling the queue directly) and the persisted JobRecord (for "Studio-visible status"/"Admin monitoring" after the fact, since a BullMQ job's in-memory progress doesn't survive the job completing or the worker restarting). */
export async function reportProgress(job: Job, jobRecordId: string, percent: number, message?: string): Promise<void> {
  await job.updateProgress(percent);
  await prisma.jobRecord.update({ where: { id: jobRecordId }, data: { result: { progress: percent, message: message ?? null } as never } });
}
