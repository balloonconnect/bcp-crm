import { logger } from "@bcp/logger";
import { emailWorker } from "./jobs/email.worker";
import { whatsappWorker } from "./jobs/whatsapp.worker";
import { imageProcessingWorker } from "./jobs/image-processing.worker";
import { faceIndexingWorker } from "./jobs/face-indexing.worker";
import { aiAnalysisWorker } from "./jobs/ai-analysis.worker";
import { pdfGenerationWorker } from "./jobs/pdf-generation.worker";
import { importWorker } from "./jobs/import.worker";
import { exportWorker } from "./jobs/export.worker";
import { webhooksWorker } from "./jobs/webhooks.worker";
import { notificationsWorker } from "./jobs/notifications.worker";
import { retentionCleanupWorker } from "./jobs/retention-cleanup.worker";
import { subscriptionExpiryWorker } from "./jobs/subscription-expiry.worker";
import { paymentReconciliationWorker } from "./jobs/payment-reconciliation.worker";
import { backupWorker } from "./jobs/backup.worker";

const log = logger.child({ service: "worker" });

log.info("worker starting…");

const workers = [
  emailWorker,
  whatsappWorker,
  imageProcessingWorker,
  faceIndexingWorker,
  aiAnalysisWorker,
  pdfGenerationWorker,
  importWorker,
  exportWorker,
  webhooksWorker,
  notificationsWorker,
  retentionCleanupWorker,
  subscriptionExpiryWorker,
  paymentReconciliationWorker,
  backupWorker,
];

// "Logs" — every worker's own completed/failed events are logged here, in addition
// to the per-job detail withJobTracking already writes onto JobRecord itself.
for (const worker of workers) {
  worker.on("completed", (job) => log.info({ queue: worker.name, jobId: job.id }, "job completed"));
  worker.on("failed", (job, err) => log.error({ queue: worker.name, jobId: job?.id, err }, "job failed"));
}

log.info({ queues: workers.map((w) => w.name) }, "worker ready");

process.on("SIGTERM", async () => {
  log.info("shutting down worker…");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});
