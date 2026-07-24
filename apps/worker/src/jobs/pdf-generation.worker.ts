import { Worker, type Job } from "bullmq";
import PDFDocument from "pdfkit";
import { StorageClient } from "@bcp/storage";
import { getEnv } from "@bcp/config";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface PdfGenerationJobData {
  jobRecordId: string;
  studioId: string | null;
  title: string;
  lines: string[];
  outputKey: string;
}

const env = getEnv();
const storage = new StorageClient({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY, bucket: env.S3_BUCKET, forcePathStyle: env.S3_FORCE_PATH_STYLE });

/**
 * A generic background PDF renderer — the same plain title+lines
 * shape `apps/api`'s report/certificate PDF generation already uses,
 * moved off the request thread here for documents large or slow
 * enough to be worth queuing (a large report, a big batch of
 * certificates) rather than holding an HTTP request open for it.
 */
export const pdfGenerationWorker = new Worker<PdfGenerationJobData>(
  "pdf-generation",
  (job: Job<PdfGenerationJobData>) =>
    withJobTracking("pdf-generation", job, () => {
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("error", reject);
        doc.on("end", () => {
          const buffer = Buffer.concat(chunks);
          storage.put(job.data.outputKey, buffer, "application/pdf").then(() => resolve({ sizeBytes: buffer.length, key: job.data.outputKey })).catch(reject);
        });

        doc.fontSize(16).text(job.data.title);
        doc.moveDown();
        doc.fontSize(10);
        for (const line of job.data.lines) doc.text(line);
        doc.end();
      });
    }),
  { connection },
);
