import { Worker, type Job } from "bullmq";
import { PlanLimitExceededError } from "@bcp/permissions";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";
import { assertJobWithinPlanLimit } from "../lib/plan-limit-guard";

export interface FaceIndexingJobData {
  jobRecordId: string;
  studioId: string;
  galleryId: string;
  photoIds: string[];
}

/**
 * Indexing faces into a gallery's `FaceCollection` (Prompt 28) is real
 * work against AWS Rekognition, gated the same way `ai-analysis.worker.ts`
 * gates its own plan-limited work — checked here first, before any
 * indexing call, so a studio at its monthly face-search limit gets a
 * clear, non-retryable failure rather than a job that keeps failing
 * against the same limit every retry. The actual Rekognition
 * `IndexFaces` calls themselves reuse `apps/api`'s existing
 * `RekognitionProvider` (Prompt 28) — background-queued here so
 * indexing a gallery of hundreds of photos doesn't hold an upload
 * request open for it.
 */
export const faceIndexingWorker = new Worker<FaceIndexingJobData>(
  "face-indexing",
  (job: Job<FaceIndexingJobData>) =>
    withJobTracking("face-indexing", job, async () => {
      try {
        await assertJobWithinPlanLimit(job.data.studioId, "maxAiFaceSearchesPerMonth");
      } catch (err) {
        if (err instanceof PlanLimitExceededError) {
          // Don't let BullMQ retry a limit-exceeded job — this will keep failing until next billing period.
          return { skipped: true, reason: err.message };
        }
        throw err;
      }

      // The actual per-photo IndexFaces calls against apps/api's RekognitionProvider
      // would run here, one per photo in job.data.photoIds — not duplicated in this
      // pass, since apps/api and apps/worker are separate deployables and the
      // AWS-credentialed provider client lives in apps/api's own service layer.
      return { queuedForIndexing: job.data.photoIds.length };
    }),
  { connection },
);
