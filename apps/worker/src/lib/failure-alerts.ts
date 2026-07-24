import { prisma } from "@bcp/database";
import { logger } from "@bcp/logger";

const log = logger.child({ service: "worker" });

/**
 * "Failure alerts" — fired exactly once, when a job is moved to the
 * dead-letter queue (not on every individual retry, which would be
 * noisy for exactly the kind of transient failure retries exist to
 * absorb). Always writes an audit-log entry, since that's this
 * platform's one durable, queryable record of what happened,
 * independent of whether any particular studio user happens to be
 * looking at a notifications inbox at the time. A studio-scoped job's
 * failure also gets flagged against the studio itself so its own
 * admins can see it via "Studio-visible status," not just a platform
 * operator.
 */
export async function sendFailureAlert(queueKey: string, studioId: string | null, jobRecordId: string, errorMessage: string): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        studioId: studioId ?? undefined,
        actorType: "system",
        action: "job.dead_letter",
        resourceType: "JobRecord",
        resourceId: jobRecordId,
        metadata: { queue: queueKey, error: errorMessage },
      },
    });
  } catch (err) {
    // Never let a failed alert itself crash the worker process — this is a best-effort notice, not part of the job's own outcome.
    log.error({ err, queue: queueKey, jobRecordId }, "failed to record job failure alert");
  }
}
