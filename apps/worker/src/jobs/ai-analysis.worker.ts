import { Worker, type Job } from "bullmq";
import { prisma } from "@bcp/database";
import { logger } from "@bcp/logger";
import { PlanLimitExceededError } from "@bcp/permissions";
import { connection } from "../queues";
import { assertJobWithinPlanLimit, recordJobUsage } from "../lib/plan-limit-guard";

const log = logger.child({ service: "worker", queue: "ai-analysis" });

export interface AiAnalysisJobData {
  studioId: string;
  jobRecordId: string;
  /** e.g. "gallery_tagging", "face_search" — which AI-analysis workload this is. */
  kind: string;
}

/**
 * Runs an AI analysis job (e.g. auto-tagging a gallery). Enforces the
 * studio's `maxAiAnalysisJobsPerMonth` plan limit *before* doing any real
 * work — see apps/worker/src/lib/plan-limit-guard.ts. A limit-exceeded job
 * is marked `failed` with a clear, non-retryable reason (retrying won't
 * help until the next billing period) rather than treated like a
 * transient failure.
 */
export const aiAnalysisWorker = new Worker<AiAnalysisJobData>(
  "ai-analysis",
  async (job: Job<AiAnalysisJobData>) => {
    const { studioId, jobRecordId, kind } = job.data;
    log.info({ jobId: job.id, studioId, kind }, "starting AI analysis job");

    await prisma.jobRecord.update({
      where: { id: jobRecordId },
      data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
    });

    try {
      await assertJobWithinPlanLimit(studioId, "maxAiAnalysisJobsPerMonth");

      // The actual AI analysis work (@bcp/ai) would run here — not built
      // in this phase, since this file exists specifically to demonstrate
      // the enforcement wiring, not the analysis feature itself.

      await recordJobUsage(studioId, "maxAiAnalysisJobsPerMonth");

      await prisma.jobRecord.update({
        where: { id: jobRecordId },
        data: { status: "completed", finishedAt: new Date() },
      });
    } catch (err) {
      const isLimitError = err instanceof PlanLimitExceededError;
      await prisma.jobRecord.update({
        where: { id: jobRecordId },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: isLimitError ? err.message : err instanceof Error ? err.message : "Unknown error",
        },
      });

      if (isLimitError) {
        // Don't let BullMQ retry a limit-exceeded job — swallow rather
        // than rethrow, since rethrowing would trigger the queue's retry
        // policy for an error that will keep recurring until next period.
        log.warn({ jobId: job.id, studioId }, "AI analysis job skipped: plan limit exceeded");
        return;
      }

      throw err;
    }
  },
  { connection },
);
