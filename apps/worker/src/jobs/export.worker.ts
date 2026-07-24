import { Worker, type Job } from "bullmq";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface ExportJobQueueData {
  jobRecordId: string;
  studioId: string;
  exportJobId: string; // the ExportJob row (Prompt 41) this queue entry corresponds to
}

/** Queue plumbing for report/data export generation — the same honest scope note as import.worker.ts applies: `apps/api`'s `export-jobs.service.ts` (Prompt 41) still runs synchronously today; this worker has the tracking/retry/DLQ infrastructure ready for when that work moves here, not a duplicated copy of the generation logic itself. */
export const exportWorker = new Worker<ExportJobQueueData>(
  "export",
  (job: Job<ExportJobQueueData>) =>
    withJobTracking("export", job, () => {
      throw new Error("Export generation has not yet been moved off the synchronous API request path onto this queue — see this file's own comment for why.");
    }),
  { connection },
);
