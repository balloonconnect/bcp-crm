import { Worker, type Job } from "bullmq";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface ImportJobQueueData {
  jobRecordId: string;
  studioId: string;
  importJobId: string; // the ImportJob row (Prompt 41) this queue entry corresponds to
}

/**
 * Queue plumbing for CSV import processing — `JobRecord` tracking,
 * retry/backoff, and dead-letter handling are all real here. What's
 * deliberately not duplicated in this pass is the actual row-by-row
 * CSV processing itself (`apps/api`'s `import-jobs.service.ts`, built
 * in Prompt 41): that logic runs synchronously today, inline in the
 * API request that triggers it, and moving it here would mean either
 * duplicating a substantial, actively-used service across two
 * separate deployables or a cross-app refactor — a real next step,
 * not something to fake by re-implementing it thinly here. This
 * worker exists so the queue, tracking, and monitoring infrastructure
 * are in place the moment that move happens.
 */
export const importWorker = new Worker<ImportJobQueueData>(
  "import",
  (job: Job<ImportJobQueueData>) =>
    withJobTracking("import", job, () => {
      throw new Error("Import processing has not yet been moved off the synchronous API request path onto this queue — see this file's own comment for why.");
    }),
  { connection },
);
