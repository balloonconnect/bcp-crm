import { Worker, type Job } from "bullmq";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface WebhookJobData {
  jobRecordId: string;
  studioId: string | null;
  url: string;
  payload: Record<string, unknown>;
}

/** A studio's own configured `WebhookEndpoint` deliveries — run through the background queue (with the queue's own retry/backoff) rather than inline at the moment the triggering event happens, so a slow or momentarily-down third-party endpoint never blocks the request that triggered it. */
export const webhooksWorker = new Worker<WebhookJobData>(
  "webhooks",
  (job: Job<WebhookJobData>) =>
    withJobTracking("webhooks", job, async () => {
      const res = await fetch(job.data.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(job.data.payload) });
      if (!res.ok) throw new Error(`Webhook endpoint returned ${res.status}`);
      return { status: res.status };
    }),
  { connection },
);
